import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function BackButton({ onPress }) {
    const { colors, typography } = useTheme();

    const styles = {
        container: {
            paddingVertical: 8,
            paddingRight: 16,
        },
        text: {
            fontSize: 16,
            ...typography.label,
        },
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <Text style={[styles.text, { color: colors.white }]}>{'← Back'}</Text>
        </TouchableOpacity>
    );
}
