import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  View, 
  ViewStyle, 
  TouchableWithoutFeedback, 
  Keyboard,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface CFEViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  withBackground?: boolean;
}

/**
 * CFEView (Clean Flex Entry View)
 * A standardized keyboard-avoiding wrapper with institutional branding.
 */
export const CFEView: React.FC<CFEViewProps> = ({ 
  children, 
  style, 
  contentStyle,
  withBackground = true 
}) => {
  const content = (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.keyboardView, contentStyle]}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (withBackground) {
    return (
      <ImageBackground 
        source={require('../../assets/images/home_bg.png')} 
        style={styles.background}
        resizeMode="cover"
      >
        {content}
      </ImageBackground>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
