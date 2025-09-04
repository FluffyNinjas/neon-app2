import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/Colors';
import ModeSwitchLoader from './ModeSwitchLoader';

// Example component showing different customization options
const ModeSwitchLoaderExample: React.FC = () => {
  const [currentExample, setCurrentExample] = useState<string | null>(null);

  const examples = [
    {
      id: 'default',
      title: 'Default Style',
      config: {
        duration: 2000,
        customAnimation: 'fade' as const,
      },
    },
    {
      id: 'neon',
      title: 'Neon Theme',
      config: {
        duration: 2500,
        customAnimation: 'scale' as const,
        customColors: {
          background: '#1a1a2e',
          overlay: 'rgba(0, 0, 0, 0.9)',
          text: '#00d4ff',
          accent: '#ff6b6b',
          icon: '#00d4ff',
        },
        message: 'Switching to neon mode...',
      },
    },
    {
      id: 'minimal',
      title: 'Minimal Style',
      config: {
        duration: 1800,
        customAnimation: 'slide' as const,
        customColors: {
          background: '#ffffff',
          overlay: 'rgba(255, 255, 255, 0.95)',
          text: '#333333',
          accent: '#007AFF',
          icon: '#007AFF',
        },
      },
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      config: {
        duration: 3000,
        customAnimation: 'spin' as const,
        customColors: {
          background: '#2c2c2c',
          overlay: 'rgba(0, 0, 0, 0.95)',
          text: '#ffffff',
          accent: '#4ECDC4',
          icon: '#FF6B35',
        },
        message: 'Transforming workspace...',
      },
    },
    {
      id: 'gradient',
      title: 'Gradient Style',
      config: {
        duration: 2200,
        customAnimation: 'scale' as const,
        customColors: {
          background: '#667eea',
          overlay: 'rgba(102, 126, 234, 0.1)',
          text: '#ffffff',
          accent: '#764ba2',
          icon: '#f093fb',
        },
        message: 'Switching perspectives...',
      },
    },
  ];

  const handleExamplePress = (example: any) => {
    setCurrentExample(example.id);
    setTimeout(() => {
      setCurrentExample(null);
    }, example.config.duration + 500);
  };

  const getCurrentExample = () => {
    return examples.find(ex => ex.id === currentExample);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mode Switch Loader Examples</Text>
        <Text style={styles.subtitle}>
          Tap any example to see the customized loading screen
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {examples.map((example) => (
          <TouchableOpacity
            key={example.id}
            style={[
              styles.exampleCard,
              currentExample === example.id && styles.exampleCardActive
            ]}
            onPress={() => handleExamplePress(example)}
            disabled={currentExample !== null}
          >
            <Text style={styles.exampleTitle}>{example.title}</Text>
            <Text style={styles.exampleDescription}>
              Animation: {example.config.customAnimation || 'fade'}
              {example.config.message && ` • Custom message`}
              {example.config.customColors && ` • Custom colors`}
            </Text>
            <View style={styles.configPreview}>
              <Text style={styles.configText}>
                Duration: {example.config.duration}ms
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Usage Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Customization Options:</Text>
        <Text style={styles.instructionText}>
          • <Text style={styles.bold}>duration</Text>: Animation duration in milliseconds
        </Text>
        <Text style={styles.instructionText}>
          • <Text style={styles.bold}>customAnimation</Text>: &apos;fade&apos;, &apos;slide&apos;, &apos;scale&apos;, &apos;spin&apos;
        </Text>
        <Text style={styles.instructionText}>
          • <Text style={styles.bold}>customColors</Text>: Override background, text, accent colors
        </Text>
        <Text style={styles.instructionText}>
          • <Text style={styles.bold}>message</Text>: Custom loading message
        </Text>
      </View>

      {/* Show the loading screen for the current example */}
      {currentExample && (
        <ModeSwitchLoader
          visible={true}
          fromMode="user"
          toMode="owner"
          onComplete={() => setCurrentExample(null)}
          {...getCurrentExample()?.config}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  exampleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exampleCardActive: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  exampleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
    lineHeight: 20,
  },
  configPreview: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    padding: 8,
  },
  configText: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: COLORS.surface,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.accent,
  },
});

export default ModeSwitchLoaderExample;