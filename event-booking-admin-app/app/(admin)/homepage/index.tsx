import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NavItem {
  href: string;
  title: string;
  emoji: string;
  desc: string;
}

const ITEMS: NavItem[] = [
  {
    href: "/(admin)/homepage/hero",
    title: "Hero section",
    emoji: "🎯",
    desc: "Heading, highlight, subtitle and description",
  },
  {
    href: "/(admin)/homepage/carousel",
    title: "Hero carousel",
    emoji: "🎞️",
    desc: "Rotating background slides",
  },
  {
    href: "/(admin)/homepage/gallery",
    title: "Gallery",
    emoji: "🖼️",
    desc: "Showcase past events",
  },
  {
    href: "/(admin)/homepage/services",
    title: "Services",
    emoji: "🛠️",
    desc: "Service tiles with custom SVG icons",
  },
  {
    href: "/(admin)/homepage/stats",
    title: "Stats",
    emoji: "📊",
    desc: "Counters (e.g. 500+ events)",
  },
  {
    href: "/(admin)/homepage/media",
    title: "Media library",
    emoji: "📚",
    desc: "Uploaded files (Cloudinary)",
  },
];

export default function HomepageHub() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-200">
        <Text className="text-2xl font-extrabold text-gray-900">Homepage</Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          Edit what shows on your public site
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as never)}
            className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 flex-row items-center active:opacity-70"
          >
            <Text className="text-3xl mr-3">{item.emoji}</Text>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {item.title}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {item.desc}
              </Text>
            </View>
            <Text className="text-gray-400 text-lg">›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
