interface WhatsAppFloatProps {
  phone: string;
}

export default function WhatsAppFloat({ phone }: WhatsAppFloatProps) {
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  const href = `https://wa.me/${digits}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-2 ring-white/40 transition-all hover:scale-105 hover:bg-[#1ebe57] hover:shadow-2xl sm:bottom-7 sm:right-7 sm:h-16 sm:w-16"
    >
      <svg
        className="h-7 w-7 sm:h-8 sm:w-8"
        fill="currentColor"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.094c-.728-.364-1.434-.798-2.07-1.338-.48-.404-.94-.836-1.355-1.31-.43-.467-.78-.99-1.06-1.553a.628.628 0 0 1-.075-.315c0-.405.785-.795.785-1.235 0-.275-.59-1.96-.785-2.16-.21-.213-.5-.273-.785-.273H10.74a1.7 1.7 0 0 0-1.235.585c-.51.514-.795 1.16-.795 1.84 0 2.05 1.36 4.04 2.18 5.05 1.81 2.21 4.36 3.52 7.27 4.27 1.04.27 2.05.42 3.04.42 1.05 0 2.06-.21 3.05-.555.5-.165.91-.51 1.21-.93.27-.405.4-.91.4-1.435v-.69c0-.135-.06-.255-.18-.345-.45-.345-1.665-.91-2.4-1.305-.345-.18-.78-.045-.96.255l-.215.31zM16.027 4.005c-6.628 0-12 5.372-12 12 0 2.115.555 4.185 1.605 6L4 28l6.135-1.61a11.94 11.94 0 0 0 5.892 1.55c6.627 0 12-5.373 12-12 0-3.21-1.245-6.225-3.51-8.49a11.92 11.92 0 0 0-8.49-3.445z" />
      </svg>
    </a>
  );
}
