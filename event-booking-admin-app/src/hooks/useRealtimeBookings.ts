import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Subscribes to all changes on the `Booking` table and invalidates the
 * cached `["bookings"]` query so the list re-fetches with fresh data.
 *
 * Realtime requires the table to be enabled under
 * Database → Replication → supabase_realtime in the Supabase dashboard.
 */
export function useRealtimeBookings() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("booking-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Booking" },
        () => {
          qc.invalidateQueries({ queryKey: ["bookings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
