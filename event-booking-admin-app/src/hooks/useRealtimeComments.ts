import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function useRealtimeComments(bookingDbId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!bookingDbId) return;

    const channel = supabase
      .channel(`booking-comments-${bookingDbId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "BookingComment",
          filter: `bookingId=eq.${bookingDbId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["comments", bookingDbId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, bookingDbId]);
}
