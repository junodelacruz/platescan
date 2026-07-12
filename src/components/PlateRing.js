import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

// Signature element: a ring that fills up like a plate being filled
// with food over the course of the day.
const SIZE = 220;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PlateRing({ consumed, goal }) {
  const { colors, typography } = useTheme();
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - pct);
  const over = consumed > goal;

  const styles = {
    wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
    center: { position: 'absolute', alignItems: 'center' },
    calories: { fontSize: 32, color: colors.ink, fontWeight: '300' },
    goalLine: { fontSize: 14, color: colors.inkMuted, marginTop: 2, opacity: 0.7 },
    calLabel: { fontSize: 11, color: colors.inkMuted, ...typography.label, marginTop: 4, letterSpacing: 1 },
  };

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.border}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={over ? colors.tomato : colors.forest}
          strokeWidth={STROKE}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.calories}>{Math.round(consumed).toLocaleString()}</Text>
        <Text style={styles.goalLine}>/ {goal.toLocaleString()}</Text>
        <Text style={styles.calLabel}>CALORIES</Text>
      </View>
    </View>
  );
}