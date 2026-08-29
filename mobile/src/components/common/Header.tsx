import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/tokens';

interface HeaderProps {
  currentRouteName?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentRouteName }) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      {/* Brand logo & name */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.logoRow}
        onPress={() => navigation.navigate('Home')}
      >
        <Image
          source={require('../../../assets/leaf.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>GreenRoute</Text>
      </TouchableOpacity>

      {/* Quick Nav Badges */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={[
            styles.navItem,
            currentRouteName === 'Home' && styles.navItemActive,
          ]}
        >
          <Text
            style={[
              styles.navText,
              currentRouteName === 'Home' && styles.navTextActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('TripWorkspace')}
          style={[
            styles.navItem,
            currentRouteName === 'TripWorkspace' && styles.navItemActive,
          ]}
        >
          <Text
            style={[
              styles.navText,
              currentRouteName === 'TripWorkspace' && styles.navTextActive,
            ]}
          >
            Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('HowItWorks')}
          style={[
            styles.navItem,
            currentRouteName === 'HowItWorks' && styles.navItemActive,
          ]}
        >
          <Text
            style={[
              styles.navText,
              currentRouteName === 'HowItWorks' && styles.navTextActive,
            ]}
          >
            How It Works
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 24,
    height: 24,
  },
  title: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: 'rgba(142, 224, 116, 0.2)',
  },
  navText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  navTextActive: {
    color: colors.primaryBright,
    fontWeight: '700',
  },
});
