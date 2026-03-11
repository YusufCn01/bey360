import React, { useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type MainStat = {
  key: string;
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
};

type QuickAction = {
  key: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const mainStats: MainStat[] = [
  {
    key: "sales",
    title: "Bugün Satış",
    value: "0,00 ₺",
    icon: "cart",
    gradient: ["#202B6A", "#2B377F"],
  },
  {
    key: "purchase",
    title: "Bugün Alış",
    value: "0,00 ₺",
    icon: "cube",
    gradient: ["#35469A", "#2A387D"],
  },
  {
    key: "cash-in",
    title: "Bugün Kasa Giriş",
    value: "0,00 ₺",
    icon: "arrow-down-circle",
    gradient: ["#2A3C8B", "#1D275E"],
  },
  {
    key: "cash-out",
    title: "Bugün Kasa Çıkış",
    value: "0,00 ₺",
    icon: "arrow-up-circle",
    gradient: ["#C4503E", "#D9683D"],
  },
];

const quickActions: QuickAction[] = [
  { key: "fast-sale", title: "Hızlı Satış", icon: "cart-outline" },
  { key: "new-product", title: "Yeni Ürün Kartı", icon: "cube-outline" },
  { key: "transfer", title: "Depo Transfer", icon: "swap-horizontal" },
  { key: "new-customer", title: "Yeni Müşteri Kartı", icon: "account-plus-outline" },
  { key: "cash-in", title: "Kasa Giriş", icon: "arrow-down-thin" },
  { key: "cash-out", title: "Kasa Çıkış", icon: "arrow-up-thin" },
];

const currencies = [
  { code: "USD", value: "44.08" },
  { code: "EURO", value: "50.9256" },
  { code: "AZN", value: "26.0745" },
];

export default function App() {
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const isTablet = width >= 768;
  const isSmallPhone = width < 420;
  const statCardWidth = isTablet ? "48.5%" : "100%";
  const gridGap = isTablet ? 12 : 0;

  const summaryItems = useMemo(
    () => [
      { label: "Yeni Stok", value: "0", icon: "arrow-down-bold-circle-outline" as const },
      { label: "Max Stok", value: "0", icon: "arrow-up-bold-circle-outline" as const },
      { label: "Uyarılar", value: "0", icon: "alert-outline" as const },
      { label: "Ortalama Süre", value: "0,00", icon: "clock-outline" as const },
      { label: "Bu Ay Satış", value: "10.740,00 ₺", icon: "chart-line" as const },
    ],
    [],
  );

  const onPressQuickAction = (title: string) => {
    Alert.alert("Yakında", `${title} modülü bağlanacak.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.headerShell}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>

          <View style={styles.pageChip}>
            <Text style={styles.pageChipText}>Ana Ekran</Text>
            <Pressable
              style={styles.refreshButton}
              onPress={() => Alert.alert("Güncellendi", "Veriler yenilendi.")}
            >
              <Ionicons name="refresh" size={20} color="#5FD6FF" />
            </Pressable>
          </View>

          <Text style={styles.logoText}>Bey360</Text>
        </View>

        <View style={styles.headerBottomRow}>
          <Pressable style={styles.iconButton}>
            <MaterialCommunityIcons name="brush-variant" size={22} color="#fff" />
          </Pressable>

          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>ADMIN</Text>
          </View>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>MERKEZ</Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={20} color="#111" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>91</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statGrid, { gap: gridGap }]}>
          {mainStats.map((stat) => (
            <LinearGradient
              key={stat.key}
              colors={stat.gradient}
              style={[styles.statCard, { width: statCardWidth }]}
            >
              <View style={styles.statIconCircle}>
                <Ionicons name={stat.icon} size={26} color="#D7E2FF" />
              </View>
              <View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
              </View>
            </LinearGradient>
          ))}
        </View>

        <View style={styles.summaryStack}>
          {summaryItems.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <MaterialCommunityIcons name={item.icon} size={24} color="#1F2A62" />
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.currencyBar}>
        {currencies.map((currency) => (
          <View key={currency.code} style={styles.currencyChip}>
            <Text style={styles.currencyText}>
              {currency.code} | {currency.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.fabContainer}>
        {menuOpen ? (
          <View style={styles.quickActionsList}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                style={[styles.quickActionChip, isSmallPhone && styles.quickActionChipSmall]}
                onPress={() => onPressQuickAction(action.title)}
              >
                <MaterialCommunityIcons name={action.icon} size={24} color="#fff" />
                <Text style={[styles.quickActionText, isSmallPhone && styles.quickActionTextSmall]}>
                  {action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          onPress={() => setMenuOpen((prev) => !prev)}
          style={[styles.fabButton, menuOpen && styles.fabButtonActive]}
        >
          <Ionicons name={menuOpen ? "close" : "add"} size={34} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  headerShell: {
    backgroundColor: "#1F2A62",
  },
  headerTopRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBottomRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A2458",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5260A9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  pageChip: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#5260A9",
    paddingLeft: 12,
    backgroundColor: "#252F73",
  },
  pageChipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  refreshButton: {
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#5260A9",
    paddingHorizontal: 12,
    height: "100%",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 28,
    letterSpacing: 1,
  },
  headerPill: {
    minWidth: 112,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5260A9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  headerPillText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  notificationButton: {
    marginLeft: "auto",
    minWidth: 96,
    height: 44,
    borderRadius: 4,
    backgroundColor: "#BDE73A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  notificationBadge: {
    minWidth: 34,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#7CB51A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  notificationBadgeText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 18,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 128,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    minHeight: 118,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  statIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
  },
  statLabel: {
    color: "#E2E9FF",
    fontSize: 20,
    fontWeight: "500",
    marginTop: 4,
  },
  summaryStack: {
    gap: 10,
  },
  summaryCard: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE1EA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryValue: {
    color: "#1A2354",
    fontWeight: "800",
    fontSize: 30,
  },
  summaryLabel: {
    color: "#25306C",
    fontWeight: "700",
    fontSize: 18,
  },
  currencyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#1F2A62",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  currencyChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5A66A8",
    alignItems: "center",
    justifyContent: "center",
  },
  currencyText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  fabContainer: {
    position: "absolute",
    right: 14,
    bottom: 86,
    alignItems: "flex-end",
  },
  fabButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#2FAEEA",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#2FAEEA",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  fabButtonActive: {
    backgroundColor: "#D45A45",
  },
  quickActionsList: {
    marginBottom: 14,
    gap: 10,
  },
  quickActionChip: {
    minWidth: 280,
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: "#5A93C3",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    elevation: 3,
  },
  quickActionChipSmall: {
    minWidth: 242,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  quickActionTextSmall: {
    fontSize: 16,
  },
});
