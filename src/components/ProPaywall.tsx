import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type AdaptyPaywallProduct } from 'react-native-adapty';
import { type ProductIdentifierKey } from '../subscriptions/config';
import { privacyUrl, termsUrl } from '../config/links';
import { useAppLocale, type TranslationKey } from '../localization';

const PAYWALL_BACKGROUND = require('../../assets/auth-bg.png');

export type ProPaywallProps = {
  busyKey: ProductIdentifierKey | 'restore' | null;
  message: string | null;
  onClose: () => void;
  onPurchase: (productKey: ProductIdentifierKey, product: AdaptyPaywallProduct) => Promise<void>;
  onRestore: () => Promise<void>;
  productPackages: Record<ProductIdentifierKey, AdaptyPaywallProduct | null>;
  isScreen?: boolean;
};

type Benefit = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: TranslationKey;
};

const BENEFITS: Benefit[] = [
  { icon: 'camera-outline', labelKey: 'paywall.benefit.camera' },
  { icon: 'fitness-outline', labelKey: 'paywall.benefit.plans' },
  { icon: 'stats-chart-outline', labelKey: 'paywall.benefit.progress' },
  { icon: 'scan-outline', labelKey: 'paywall.benefit.fullScene' },
];

export function ProPaywall({
  busyKey,
  message,
  onClose,
  onPurchase,
  onRestore,
  productPackages,
  isScreen = false,
}: ProPaywallProps) {
  const { height, width } = useWindowDimensions();
  const { isRTL, t } = useAppLocale();
  const isTinyHeight = height < 700;
  const isNarrowWidth = width < 380;

  const options = useMemo(
    () =>
      (['yearly', 'monthly'] as ProductIdentifierKey[])
        .map((key) => ({ key, product: productPackages[key] }))
        .filter((option): option is { key: ProductIdentifierKey; product: AdaptyPaywallProduct } =>
          Boolean(option.product)
        ),
    [productPackages]
  );

  const defaultSelectedKey = useMemo<ProductIdentifierKey | null>(() => {
    if (options.some((option) => option.key === 'yearly')) return 'yearly';
    return options[0]?.key ?? null;
  }, [options]);

  const [selectedKey, setSelectedKey] = useState<ProductIdentifierKey | null>(null);

  useEffect(() => {
    setSelectedKey(defaultSelectedKey);
  }, [defaultSelectedKey]);

  const selectedOption = options.find((option) => option.key === selectedKey) ?? options[0] ?? null;
  const selectedCtaText = selectedOption
    ? t('paywall.ctaWithPrice', { price: getProductPrice(selectedOption.product) })
    : t('paywall.choosePlan');

  return (
    <ImageBackground source={PAYWALL_BACKGROUND} resizeMode="cover" style={styles.background}>
      <View style={styles.blackout} />
      <View style={styles.sideShade} />
      <SafeAreaView edges={['bottom', 'top']} style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isTinyHeight && styles.scrollContentCompact,
            isScreen && styles.screenScrollContent,
          ]}
          style={styles.scrollView}
        >
          <View style={styles.contentWrap}>
            {!isScreen && (
              <Pressable
                accessibilityLabel={t('common.close')}
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </Pressable>
            )}

            <View style={[styles.heroCopy, isRTL && styles.rtlBlock]}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={2}
                style={[styles.title, isTinyHeight && styles.titleCompact, isRTL && styles.rtlText]}
              >
                {t('paywall.title')}
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={3}
                style={[styles.subtitle, isRTL && styles.rtlText]}
              >
                {t('paywall.subtitle')}
              </Text>
            </View>

            <View style={styles.benefitsList}>
              {BENEFITS.map((benefit) => (
                <BenefitItem
                  icon={benefit.icon}
                  isRTL={isRTL}
                  key={benefit.labelKey}
                  label={t(benefit.labelKey)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.purchasePanel}>
          <View style={styles.productList}>
            {options.map(({ key, product }) => (
              <PlanOption
                busy={busyKey !== null}
                isRTL={isRTL}
                isSelected={selectedKey === key}
                key={product.vendorProductId}
                narrow={isNarrowWidth}
                onPress={() => setSelectedKey(key)}
                planName={t(key === 'yearly' ? 'paywall.yearlyPlan' : 'paywall.monthlyPlan')}
                price={getProductPriceWithPeriod(product, key, t)}
                badge={key === 'yearly' ? t('paywall.bestValue') : null}
              />
            ))}

            {options.length === 0 ? (
              <View style={styles.loadingProducts}>
                <ActivityIndicator color="#f43f5e" />
                <Text style={styles.loadingProductsText}>{t('paywall.loadingProducts')}</Text>
              </View>
            ) : null}
          </View>

          {message ? (
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!selectedOption || busyKey !== null}
            onPress={() => {
              if (selectedOption) {
                void onPurchase(selectedOption.key, selectedOption.product);
              }
            }}
            style={({ pressed }) => [
              styles.primaryCta,
              (!selectedOption || busyKey !== null) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {selectedOption && busyKey === selectedOption.key ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.primaryCtaText}>
                {selectedCtaText}
              </Text>
            )}
          </Pressable>

          <Text style={[styles.disclosure, isRTL && styles.rtlText]} numberOfLines={3}>
            {t('paywall.subscriptionDisclosure')}
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={busyKey !== null}
            onPress={onRestore}
            style={styles.restoreButton}
          >
            {busyKey === 'restore' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.footerLinkText}>{t('paywall.restore')}</Text>
            )}
          </Pressable>

          <View style={[styles.legalLinks, isRTL && styles.rowReverse]}>
            <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(privacyUrl); }} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>{t('paywall.privacy')}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(termsUrl); }} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>{t('paywall.terms')}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function BenefitItem({
  icon,
  isRTL,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  isRTL: boolean;
  label: string;
}) {
  return (
    <View style={[styles.benefitItem, isRTL && styles.rowReverse]}>
      <View style={styles.checkCircle}>
        <Ionicons name={icon} size={13} color="#f43f5e" />
      </View>
      <Text style={[styles.benefitText, isRTL && styles.rtlText]}>{label}</Text>
    </View>
  );
}

function PlanOption({
  badge,
  busy,
  isRTL,
  isSelected,
  narrow,
  onPress,
  planName,
  price,
}: {
  badge: string | null;
  busy: boolean;
  isRTL: boolean;
  isSelected: boolean;
  narrow: boolean;
  onPress: () => void;
  planName: string;
  price: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planButton,
        isSelected && styles.planButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      {badge ? (
        <View style={[styles.bestBadge, isRTL ? styles.bestBadgeLeft : styles.bestBadgeRight]}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.bestBadgeText}>
            {badge}
          </Text>
        </View>
      ) : null}
      <View style={[styles.planRow, isRTL && styles.rowReverse, narrow && styles.planRowNarrow]}>
        <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.planName, isRTL && styles.rtlText]}>
          {planName}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={narrow ? 2 : 1}
          style={[styles.planPrice, isRTL && styles.rtlText]}
        >
          {price}
        </Text>
      </View>
    </Pressable>
  );
}

function getProductPrice(product: AdaptyPaywallProduct): string {
  return product.price?.localizedString ?? '';
}

function getProductPriceWithPeriod(
  product: AdaptyPaywallProduct,
  key: ProductIdentifierKey,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const price = getProductPrice(product);
  const period = t(key === 'yearly' ? 'paywall.perYear' : 'paywall.perMonth');
  return price ? t('paywall.pricePerPeriod', { price, period }) : t(key === 'yearly' ? 'paywall.yearlyPlan' : 'paywall.monthlyPlan');
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#000000',
  },
  blackout: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  sideShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 310,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  screenScrollContent: {
    paddingTop: 28,
  },
  scrollContentCompact: {
    paddingBottom: 286,
  },
  contentWrap: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(18, 18, 18, 0.76)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginBottom: 24,
    width: 34,
  },
  heroCopy: {
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34,
    maxWidth: 360,
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 31,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.84)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 8,
    maxWidth: 390,
  },
  benefitsList: {
    gap: 9,
    marginTop: 2,
  },
  benefitItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  benefitText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  purchasePanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
  },
  productList: {
    alignSelf: 'center',
    gap: 10,
    maxWidth: 520,
    width: '100%',
  },
  planButton: {
    borderColor: 'rgba(255, 255, 255, 0.38)',
    borderRadius: 7,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  planButtonSelected: {
    borderColor: '#f43f5e',
  },
  planRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  planRowNarrow: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 4,
  },
  planName: {
    color: '#ffffff',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  planPrice: {
    color: '#ffffff',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  bestBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    maxWidth: 118,
    paddingHorizontal: 7,
    paddingVertical: 2,
    position: 'absolute',
    top: -10,
  },
  bestBadgeRight: {
    right: 10,
  },
  bestBadgeLeft: {
    left: 10,
  },
  bestBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  loadingProducts: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 58,
  },
  loadingProductsText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    alignSelf: 'center',
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 8,
    maxWidth: 520,
    textAlign: 'center',
    width: '100%',
  },
  primaryCta: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#f43f5e',
    borderRadius: 7,
    height: 50,
    justifyContent: 'center',
    marginTop: 10,
    maxWidth: 520,
    width: '100%',
  },
  primaryCtaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
  },
  disclosure: {
    alignSelf: 'center',
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 8,
    maxWidth: 520,
    textAlign: 'center',
    width: '100%',
  },
  restoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: 24,
    minWidth: 92,
  },
  legalLinks: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 34,
    justifyContent: 'center',
    minHeight: 24,
  },
  footerLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    minWidth: 70,
  },
  footerLinkText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.78,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rtlBlock: {
    alignItems: 'flex-end',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
