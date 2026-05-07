import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
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

export type ProPaywallProps = {
  busyKey: ProductIdentifierKey | 'restore' | null;
  message: string | null;
  onClose: () => void;
  onPurchase: (productKey: ProductIdentifierKey, product: AdaptyPaywallProduct) => Promise<void>;
  onRestore: () => Promise<void>;
  productPackages: Record<ProductIdentifierKey, AdaptyPaywallProduct | null>;
  isScreen?: boolean;
};

export function ProPaywall({
  busyKey,
  message,
  onClose,
  onPurchase,
  onRestore,
  productPackages,
  isScreen = false,
}: ProPaywallProps) {
  const { height } = useWindowDimensions();
  const isTinyHeight = height < 680;

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
  const selectedCtaText = selectedOption ? getPrimaryCtaText(selectedOption.key, selectedOption.product) : 'Continue';

  return (
    <SafeAreaView edges={['bottom', 'top']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.paywallCard}>
          <View style={styles.paywallHeader}>
            <View style={styles.proBadgeHeader}>
              <Ionicons name="diamond" size={12} color="#ff4d6d" />
              <Text style={styles.proBadgeHeaderText}>Try premium</Text>
            </View>
            {!isScreen && (
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.42)" />
              </Pressable>
            )}
          </View>

          <View style={styles.paywallIntro}>
            <Text style={[styles.paywallTitle, isTinyHeight && styles.paywallTitleTiny]}>
              Master your push-ups.
            </Text>
          </View>

          <View style={styles.benefitsList}>
            <BenefitItem
              icon="calendar-outline"
              title="Custom Plans"
              description="Rebuild your schedule anytime."
            />
            <BenefitItem
              icon="camera-outline"
              title="Full Scene"
              description="Rep detection from any angle."
            />
            <BenefitItem
              icon="stats-chart-outline"
              title="Deep History"
              description="Monthly and yearly progress."
            />
          </View>

          <View style={styles.productList}>
            {options.map(({ key, product }) => (
              <Pressable
                accessibilityRole="button"
                disabled={busyKey !== null}
                key={product.vendorProductId}
                onPress={() => setSelectedKey(key)}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.productButton,
                  selectedKey === key && styles.selectedProductButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <View style={[styles.selectionDot, selectedKey === key && styles.selectionDotActive]}>
                  {selectedKey === key && <View style={styles.selectionDotInner} />}
                </View>
                <View style={styles.productTextWrap}>
                  <Text style={styles.productTitle}>{getPlanName(key)}</Text>
                  <Text style={styles.productSubtitle} numberOfLines={1}>{getProductSubtitle(product, key)}</Text>
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceText}>{getProductPrice(product)}</Text>
                  {key === 'yearly' && (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>SAVE 10%</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {message ? <Text style={styles.paywallMessage} numberOfLines={2}>{message}</Text> : null}

          <View style={styles.ctaContainer}>
            <Pressable
              accessibilityRole="button"
              disabled={!selectedOption || busyKey !== null}
              onPress={() => {
                if (selectedOption) {
                  void onPurchase(selectedOption.key, selectedOption.product);
                }
              }}
              style={({ pressed }: { pressed: boolean }) => [
                styles.primaryCta,
                (!selectedOption || busyKey !== null) && styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
            >
              {selectedOption && busyKey === selectedOption.key ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryCtaText}>
                  {selectedCtaText}
                </Text>
              )}
            </Pressable>

            <Text style={styles.trialInfo}>
              {selectedOption ? getSubscriptionTermsText(selectedOption.key, selectedOption.product) : 'Choose a plan to continue.'}
            </Text>
          </View>

          <View style={styles.paywallFooter}>
            <Pressable
              accessibilityRole="button"
              disabled={busyKey !== null}
              onPress={onRestore}
              style={styles.restoreButton}
            >
              {busyKey === 'restore' ? (
                <ActivityIndicator color="#f43f5e" />
              ) : (
                <Text style={styles.restoreText}>Restore purchases</Text>
              )}
            </Pressable>
            <View style={styles.legalLinks}>
              <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(termsUrl); }}>
                <Text style={styles.legalLinkText}>Terms of Use</Text>
              </Pressable>
              <Text style={styles.legalSeparator}>·</Text>
              <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(privacyUrl); }}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BenefitItem({ icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIconContainer}>
        <Ionicons name={icon} size={18} color="#ff4d6d" />
      </View>
      <View style={styles.benefitTextContainer}>
        <Text style={styles.benefitTitle}>
          {title} <Text style={styles.benefitDescription}>{description}</Text>
        </Text>
      </View>
    </View>
  );
}

function getPlanName(key: ProductIdentifierKey): string {
  return key === 'yearly' ? 'Yearly' : 'Monthly';
}

function getProductSubtitle(product: AdaptyPaywallProduct, key: ProductIdentifierKey): string {
  const freeTrialPhase = product.subscription?.offer?.phases.find((phase) => phase.paymentMode === 'free_trial');
  const trialPeriod = freeTrialPhase?.localizedNumberOfPeriods ?? freeTrialPhase?.localizedSubscriptionPeriod;
  const trialLabel = trialPeriod ? `${trialPeriod} free trial` : '3-day free trial';

  return key === 'yearly'
    ? `${trialLabel}, then yearly access.`
    : 'Monthly access. No free trial.';
}

function getPrimaryCtaText(key: ProductIdentifierKey, product: AdaptyPaywallProduct): string {
  const freeTrialPhase = product.subscription?.offer?.phases.find((phase) => phase.paymentMode === 'free_trial');
  const trialPeriod = freeTrialPhase?.localizedNumberOfPeriods ?? freeTrialPhase?.localizedSubscriptionPeriod;
  const trialLabel = trialPeriod ? `${trialPeriod} free trial` : '3-day free trial';

  return key === 'yearly' ? `Start ${trialLabel}` : `Continue - ${getProductPrice(product)}`;
}

function getProductPrice(product: AdaptyPaywallProduct): string {
  return product.price?.localizedString ?? 'Continue';
}

function getSubscriptionTermsText(key: ProductIdentifierKey, product: AdaptyPaywallProduct): string {
  const price = getProductPrice(product);

  if (key === 'yearly') {
    return `3 days free, then ${price}/year. Renews automatically until canceled.`;
  }

  return `${price}/month. Renews automatically until canceled.`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  paywallCard: {
    maxWidth: 520,
    width: '100%',
  },
  paywallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  proBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.2)',
  },
  proBadgeHeaderText: {
    color: '#ff4d6d',
    fontSize: 11,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  paywallIntro: {
    marginBottom: 8,
  },
  paywallTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 8,
  },
  paywallTitleTiny: {
    fontSize: 27,
    lineHeight: 31,
    marginBottom: 6,
  },
  benefitsList: {
    gap: 12,
    marginBottom: 28,
    marginTop: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 77, 109, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.15)',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
    marginBottom: 2,
  },
  benefitDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
    fontSize: 13,
  },
  productList: {
    gap: 12,
    marginBottom: 32,
  },
  productButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedProductButton: {
    borderColor: '#ff4d6d',
    borderWidth: 2,
  },
  pressedButton: {
    opacity: 0.82,
  },
  selectionDot: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDotActive: {
    backgroundColor: '#ff4d6d',
    borderColor: '#ff4d6d',
  },
  selectionDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  productTextWrap: {
    flex: 1,
  },
  productTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  productSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  saveBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  saveBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  paywallMessage: {
    backgroundColor: 'rgba(252, 165, 165, 0.08)',
    borderColor: 'rgba(252, 165, 165, 0.18)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  ctaContainer: {
    marginTop: 10,
    gap: 16,
  },
  primaryCta: {
    alignItems: 'center',
    backgroundColor: '#ff4d6d',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryCtaText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.64,
  },
  trialInfo: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  paywallFooter: {
    marginTop: 24,
    gap: 8,
  },
  restoreButton: {
    alignItems: 'center',
    minHeight: 34,
    justifyContent: 'center',
  },
  restoreText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  legalLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 22,
  },
  legalLinkText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  legalSeparator: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 12,
    fontWeight: '900',
  },
});
