import { ActivityIndicator, Pressable, Text } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md";
}

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-brand-600 active:bg-brand-700",
  secondary: "bg-gray-200 active:bg-gray-300",
  danger: "bg-red-600 active:bg-red-700",
  success: "bg-green-600 active:bg-green-700",
};

const VARIANT_TEXT: Record<NonNullable<Props["variant"]>, string> = {
  primary: "text-white",
  secondary: "text-gray-900",
  danger: "text-white",
  success: "text-white",
};

export default function ActionButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  fullWidth,
  size = "md",
}: Props) {
  const padding = size === "sm" ? "px-3 py-2" : "px-4 py-3";
  const text = size === "sm" ? "text-sm" : "text-base";
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-xl ${padding} ${VARIANT_CLASSES[variant]} ${
        fullWidth ? "w-full" : ""
      } ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? "#111" : "#fff"}
          size="small"
        />
      ) : (
        <Text
          className={`${VARIANT_TEXT[variant]} ${text} font-semibold text-center`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
