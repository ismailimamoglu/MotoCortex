/**
 * AdapterTierBenchmark.ts
 * 
 * MotoCortex 2-Stage OBD2 Adapter Hardware Tiering & Preflight Benchmark Engine (v1.1).
 * Stage 1: Quick Health Check (1-3s) on connection setup.
 * Stage 2: Deep Preflight Test prior to ECU write (ISO-TP multi-frame & buffer overflow test).
 */

import { AdapterTier, BenchmarkResult } from './FeatureTypes';
import * as Logger from '../../services/Logger';

export interface DongleRawStats {
    atResponseLatencyMs: number;
    bufferSizeBytes: number;
    hasHardwareFlowControl: boolean; // AT FC support
    packetDropRate: number; // 0.0 to 1.0
}

export class AdapterTierBenchmark {
    private cachedQuickResult: BenchmarkResult | null = null;
    private cachedDeepResult: BenchmarkResult | null = null;

    /**
     * Stage 1: Quick Health Check executed on BLE/Serial connection setup (1-3 seconds).
     */
    public evaluateQuickHealth(stats: Partial<DongleRawStats>): BenchmarkResult {
        const latency = stats.atResponseLatencyMs ?? 50;
        const buffer = stats.bufferSizeBytes ?? 512;
        const hasFc = stats.hasHardwareFlowControl ?? false;
        const dropRate = stats.packetDropRate ?? 0;

        let tier = AdapterTier.TIER_2_STANDARD;

        if (latency < 20 && buffer >= 2048 && hasFc && dropRate < 0.01) {
            tier = AdapterTier.TIER_1_PRO;
        } else if (latency > 150 || buffer < 256 || dropRate > 0.1) {
            tier = AdapterTier.TIER_3_UNSAFE;
        }

        const result: BenchmarkResult = {
            tier,
            latencyMs: latency,
            bufferCapacityBytes: buffer,
            multiFrameSupported: hasFc || buffer >= 512,
            frameDropRatePercent: dropRate * 100,
            testedAt: Date.now(),
            stage: 'QUICK_HEALTH_CHECK'
        };

        this.cachedQuickResult = result;
        Logger.log('ADAPTER_BENCHMARK', `Stage 1 Quick Health Result: ${tier} (Latency: ${latency}ms, Buffer: ${buffer}B)`);
        return result;
    }

    /**
     * Stage 2: Deep Preflight Test executed right before feature write operation.
     * Evaluates multi-frame ISO-TP payload stability under load.
     */
    public executeDeepPreflight(stats: DongleRawStats): BenchmarkResult {
        const quick = this.cachedQuickResult;
        let tier = stats.atResponseLatencyMs < 20 && stats.bufferSizeBytes >= 2048 && stats.hasHardwareFlowControl && stats.packetDropRate === 0
            ? AdapterTier.TIER_1_PRO
            : (stats.atResponseLatencyMs <= 100 && stats.bufferSizeBytes >= 512 && stats.packetDropRate <= 0.05
                ? AdapterTier.TIER_2_STANDARD
                : AdapterTier.TIER_3_UNSAFE);

        // Degrade tier if quick health was worse
        if (quick && quick.tier === AdapterTier.TIER_3_UNSAFE) {
            tier = AdapterTier.TIER_3_UNSAFE;
        }

        const result: BenchmarkResult = {
            tier,
            latencyMs: stats.atResponseLatencyMs,
            bufferCapacityBytes: stats.bufferSizeBytes,
            multiFrameSupported: stats.hasHardwareFlowControl,
            frameDropRatePercent: stats.packetDropRate * 100,
            testedAt: Date.now(),
            stage: 'DEEP_PREFLIGHT'
        };

        this.cachedDeepResult = result;
        Logger.log('ADAPTER_BENCHMARK', `Stage 2 Deep Preflight Result: ${tier} (Drop rate: ${(stats.packetDropRate * 100).toFixed(1)}%)`);
        return result;
    }

    /**
     * Validates if the current adapter tier meets the feature's safety requirement.
     */
    public validateAdapterTierForFeature(requiredTier: AdapterTier, currentTier: AdapterTier): void {
        if (currentTier === AdapterTier.TIER_3_UNSAFE) {
            throw new Error('SAFETY_VIOLATION_UNSAFE_ADAPTER: ECU write operations are 100% blocked on Tier 3 low-quality or fake OBD adapters to prevent vehicle bricking.');
        }

        if (requiredTier === AdapterTier.TIER_1_PRO && currentTier !== AdapterTier.TIER_1_PRO) {
            throw new Error('SAFETY_VIOLATION_TIER_MISMATCH: This high-risk feature requires a Tier 1 Pro adapter (vLinker MC+, STN2120, UniCarScan, OBDLink MX+).');
        }
    }

    public getLatestResult(): BenchmarkResult | null {
        return this.cachedDeepResult || this.cachedQuickResult;
    }
}

export const adapterTierBenchmark = new AdapterTierBenchmark();
