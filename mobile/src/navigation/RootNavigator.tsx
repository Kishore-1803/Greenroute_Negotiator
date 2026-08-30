import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Compass, Info, User } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { TripWorkspaceScreen } from '../screens/TripWorkspaceScreen';
import { HowItWorksScreen } from '../screens/HowItWorksScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { colors } from '../theme/tokens';
import { AuthProvider } from '../lib/authContext';
import { AppSettingsProvider } from '../lib/appSettings';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
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
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export const RootNavigator: React.FC = () => {
  return (
    <AuthProvider>
      <AppSettingsProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
      </AppSettingsProvider>
    </AuthProvider>
  );
};
