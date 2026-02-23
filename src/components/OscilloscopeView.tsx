import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';

const C = {
    bg: '#0a0a0a',
    card: '#111318',
    border: '#1e2430',
    cyan: '#00d4ff',
    green: '#00ff88',
    red: '#ff3b3b',
    amber: '#ffb800',
    textPri: '#e8eaed',
    textSec: '#6b7280',
    mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

const HISTORY_SIZE = 40; // Number of data points to display
const CHART_HEIGHT = 80;
const BAR_WIDTH = 3;
const BAR_GAP = 1;

interface OscilloscopeProps {
    label: string;
    value: number | null;
    unit: string;
    color: string;
    min: number;
    max: number;
}

export default function OscilloscopeView({ label, value, unit, color, min, max }: OscilloscopeProps) {
    const historyRef = useRef<number[]>(new Array(HISTORY_SIZE).fill(0));
    const [history, setHistory] = useState<number[]>(new Array(HISTORY_SIZE).fill(0));

    useEffect(() => {
        const v = value !== null ? value : 0;
        const clamped = Math.max(min, Math.min(max, v));
        historyRef.current = [...historyRef.current.slice(1), clamped];
        setHistory([...historyRef.current]);
    }, [value, min, max]);

    const normalize = (v: number) => {
        const range = max - min;
        if (range === 0) return 0;
        return ((v - min) / range) * CHART_HEIGHT;
    };

    // Grid lines (25%, 50%, 75%)
    const gridLines = [0.25, 0.5, 0.75];

    return (
        <View style={os.container}>
            {/* Header */}
            <View style={os.header}>
                <View>
                    <Text style={[os.label, { color }]}>{label}</Text>
                    <Text style={os.range}>{min} - {max} {unit}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[os.currentValue, { color }]}>
                        {value !== null ? value : '--'}
                    </Text>
                    <Text style={os.unitText}>{unit}</Text>
                </View>
            </View>

            {/* Chart Area */}
            <View style={os.chartArea}>
                {/* Grid lines */}
                {gridLines.map((pct, i) => (
                    <View
                        key={i}
                        style={[os.gridLine, { bottom: pct * CHART_HEIGHT }]}
                    />
                ))}

                {/* Bars */}
                <View style={os.barsContainer}>
                    {history.map((v, i) => {
                        const height = normalize(v);
                        const isLatest = i === history.length - 1;
                        const opacity = 0.3 + (i / history.length) * 0.7; // Fade old data
                        return (
                            <View
                                key={i}
                                style={[
                                    os.bar,
                                    {
                                        height: Math.max(1, height),
                                        backgroundColor: color,
                                        opacity,
                                        width: BAR_WIDTH,
                                        marginRight: BAR_GAP,
                                        borderRadius: isLatest ? 2 : 1,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Peak line */}
                {value !== null && (
                    <View
                        style={[
                            os.peakLine,
                            {
                                bottom: normalize(value),
                                backgroundColor: color,
                            },
                        ]}
                    />
                )}
            </View>
        </View>
    );
}

const os = StyleSheet.create({
    container: {
        backgroundColor: '#060808',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#0a1a0a',
        marginBottom: 8,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        letterSpacing: 1,
    },
    range: {
        fontSize: 7,
        color: '#333',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginTop: 2,
    },
    currentValue: {
        fontSize: 18,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    unitText: {
        fontSize: 8,
        color: '#6b7280',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    chartArea: {
        height: CHART_HEIGHT,
        marginHorizontal: 8,
        marginBottom: 8,
        position: 'relative',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#0a1a0a',
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: CHART_HEIGHT,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    bar: {
        // Dynamic styles applied inline
    },
    peakLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        opacity: 0.3,
    },
});
