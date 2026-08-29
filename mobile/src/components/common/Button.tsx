import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, radii } from '../../theme/tokens';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'forest' | 'glass' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'forest',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  let btnBackground = colors.primaryDark;
  let textColor = colors.textWhite;
  let borderWidth = 0;
  let borderColor = 'transparent';

  if (variant === 'primary') {
    btnBackground = colors.primaryBright;
    textColor = colors.textDark;
  } else if (variant === 'forest') {
    btnBackground = colors.primaryDark;
    textColor = colors.textWhite;
  } else if (variant === 'glass') {
    btnBackground = 'rgba(255, 255, 255, 0.12)';
    textColor = colors.textWhite;
    borderWidth = 1;
    borderColor = colors.borderLight;
  } else if (variant === 'outline') {
    btnBackground = 'transparent';
    textColor = colors.primaryBright;
    borderWidth = 1;
    borderColor = colors.primaryBright;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: btnBackground,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textDark : colors.textWhite}
        />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.text, { color: textColor }, textStyle]}>
            {title}
          </Text>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconContainer: {
    marginLeft: 6,
  },
});
