import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { COLORS } from '../../constants/Colors'

const profile = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>User Profile</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default profile