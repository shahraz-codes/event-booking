import { Text, View } from "react-native";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Section({ title, subtitle, children, className }: Props) {
  return (
    <View
      className={`bg-white rounded-2xl border border-gray-200 p-4 ${className ?? ""}`}
    >
      <Text className="text-xs uppercase tracking-wider font-bold text-gray-500">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-xs text-gray-500 mt-0.5">{subtitle}</Text>
      ) : null}
      <View className="mt-3">{children}</View>
    </View>
  );
}
