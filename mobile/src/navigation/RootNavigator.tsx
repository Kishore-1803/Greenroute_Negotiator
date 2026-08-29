import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Compass, Info } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { TripWorkspaceScreen } from '../screens/TripWorkspaceScreen';
import { HowItWorksScreen } from '../screens/HowItWorksScreen';
import { colors } from '../theme/tokens';

const Tab = createBottomTabNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#122018',
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            borderTopWidth: 1,
            height: 58,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primaryBright,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />,
          }}
        />
        <Tab.Screen
          name="TripWorkspace"
          component={TripWorkspaceScreen}
          options={{
            tabBarLabel: 'Trip Workspace',
            tabBarIcon: ({ color, size }) => <Compass size={size - 2} color={color} />,
          }}
        />
        <Tab.Screen
          name="HowItWorks"
          component={HowItWorksScreen}
          options={{
            tabBarLabel: 'How It Works',
            tabBarIcon: ({ color, size }) => <Info size={size - 2} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
