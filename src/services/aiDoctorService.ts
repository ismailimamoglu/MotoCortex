import i18n from '../i18n';

export interface AiDiagnosticContext {
  dtcCodes: string[];
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vin?: string;
  engineVoltage?: number;
  coolantTemp?: number;
  rpm?: number;
  freezeFrameData?: Record<string, string>;
  userQuery?: string;
}

export type RiskLevel = 'CRITICAL' | 'WARNING' | 'SAFE' | 'UNKNOWN';

export interface AiDiagnosticResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0 to 100 (100 = perfectly safe, 0 = critical)
  title: string;
  summary: string;
  causes: string[];
  recommendedSteps: string[];
  estimatedCostRange: string;
  canDriveSafetyText: string;
}

/**
 * AI Diagnostic Assistant Service ("MotoCortex AI Doctor")
 * Translates DTC codes and live telemetry into 26-language actionable mechanical advice.
 */
export class AiDoctorService {
  /**
   * Generates a structured diagnostic analysis for the provided DTC context.
   */
  public static async analyzeFaults(context: AiDiagnosticContext): Promise<AiDiagnosticResult> {
    const lang = i18n.language || 'en';
    const dtcCount = context.dtcCodes.length;

    // Determine risk level based on DTC codes & telemetry
    let riskLevel: RiskLevel = 'SAFE';
    let riskScore = 95;

    if (dtcCount === 0) {
      riskLevel = 'SAFE';
      riskScore = 100;
    } else if (context.dtcCodes.some(c => c.startsWith('P03') || c.startsWith('P02') || c.startsWith('P07'))) {
      riskLevel = 'CRITICAL';
      riskScore = 25;
    } else if (context.dtcCodes.some(c => c.startsWith('P01') || c.startsWith('P04') || c.startsWith('C') || c.startsWith('B'))) {
      riskLevel = 'WARNING';
      riskScore = 60;
    } else {
      riskLevel = 'WARNING';
      riskScore = 70;
    }

    // Attempt server-side Supabase Edge Function or env API request if available
    if (dtcCount > 0) {
      try {
        // 1. Try Supabase Edge Function first (Secure Server-Side Secret proxy)
        let supabaseClient: any = null;
        try {
          const clientMod = require('../api/supabaseClient');
          supabaseClient = clientMod?.supabase;
        } catch (_) {}

        if (supabaseClient && typeof supabaseClient.functions?.invoke === 'function') {
          const { data: edgeData, error: edgeErr } = await supabaseClient.functions.invoke('ai-doctor', {
            body: {
              dtcCodes: context.dtcCodes,
              vehicleMake: context.vehicleMake,
              vehicleModel: context.vehicleModel,
              vehicleYear: context.vehicleYear,
              engineVoltage: context.engineVoltage,
              coolantTemp: context.coolantTemp,
              freezeFrameData: context.freezeFrameData,
              lang
            }
          });

          if (!edgeErr && edgeData && edgeData.title) {
            return {
              riskLevel,
              riskScore,
              title: edgeData.title || `DTC Analysis (${context.dtcCodes.join(', ')})`,
              summary: edgeData.summary || 'Diagnostic analysis completed.',
              causes: Array.isArray(edgeData.causes) ? edgeData.causes : [],
              recommendedSteps: Array.isArray(edgeData.recommendedSteps) ? edgeData.recommendedSteps : [],
              estimatedCostRange: edgeData.estimatedCostRange || 'Variable',
              canDriveSafetyText: edgeData.canDriveSafetyText || 'Drive with caution to nearest service center.'
            };
          }
        }
      } catch (edgeErr) {
        console.warn('[AiDoctorService] Supabase Edge Function call bypassed/failed:', edgeErr);
      }
    }

    // Offline Intelligent Fallback Rule Engine
    return this.generateOfflineFallback(context, riskLevel, riskScore);
  }

  private static generateOfflineFallback(
    context: AiDiagnosticContext,
    riskLevel: RiskLevel,
    riskScore: number
  ): AiDiagnosticResult {
    const codes = context.dtcCodes.join(', ');

    if (context.dtcCodes.length === 0) {
      return {
        riskLevel: 'SAFE',
        riskScore: 100,
        title: i18n.t('aiDoctor.noFaultsTitle', { defaultValue: 'System Optimal — No Fault Codes Detected' }),
        summary: i18n.t('aiDoctor.noFaultsSummary', { defaultValue: 'ECU telemetry shows no active diagnostic trouble codes. Engine parameters are within normal operating thresholds.' }),
        causes: [],
        recommendedSteps: [
          i18n.t('aiDoctor.stepMaintain', { defaultValue: 'Maintain regular oil and filter service intervals.' }),
          i18n.t('aiDoctor.stepCheckVoltage', { defaultValue: 'Periodically check battery resting voltage.' })
        ],
        estimatedCostRange: '$0',
        canDriveSafetyText: i18n.t('aiDoctor.safeDrive', { defaultValue: 'Safe for regular operation.' })
      };
    }

    const isEngineMisfire = context.dtcCodes.some(c => c.startsWith('P030'));
    const isO2Sensor = context.dtcCodes.some(c => c.startsWith('P013') || c.startsWith('P014'));

    if (isEngineMisfire) {
      return {
        riskLevel: 'CRITICAL',
        riskScore: 30,
        title: i18n.t('aiDoctor.misfireTitle', { defaultValue: 'Engine Cylinder Misfire Detected' }),
        summary: i18n.t('aiDoctor.misfireSummary', { defaultValue: 'Active misfire detected in one or more cylinders. Unburnt fuel may enter catalytic converter causing permanent damage.' }),
        causes: [
          i18n.t('aiDoctor.causeSparkPlug', { defaultValue: 'Worn or fouled spark plug' }),
          i18n.t('aiDoctor.causeIgnitionCoil', { defaultValue: 'Failing ignition coil or wire' }),
          i18n.t('aiDoctor.causeFuelInjector', { defaultValue: 'Clogged or faulty fuel injector' })
        ],
        recommendedSteps: [
          i18n.t('aiDoctor.stepInspectPlugs', { defaultValue: 'Inspect and gap spark plugs.' }),
          i18n.t('aiDoctor.stepSwapCoils', { defaultValue: 'Swap ignition coils between cylinders to test for fault transfer.' }),
          i18n.t('aiDoctor.stepFuelPressure', { defaultValue: 'Measure fuel rail pressure.' })
        ],
        estimatedCostRange: '$40 - $180',
        canDriveSafetyText: i18n.t('aiDoctor.criticalDrive', { defaultValue: 'Do not drive extended distances under heavy throttle. Drive immediately to service.' })
      };
    }

    if (isO2Sensor) {
      return {
        riskLevel: 'WARNING',
        riskScore: 65,
        title: i18n.t('aiDoctor.o2Title', { defaultValue: 'Oxygen Sensor Circuit Malfunction' }),
        summary: i18n.t('aiDoctor.o2Summary', { defaultValue: 'Air-fuel mixture feedback is degraded. Engine may run rich or lean, reducing fuel efficiency.' }),
        causes: [
          i18n.t('aiDoctor.causeO2Heater', { defaultValue: 'O2 sensor heating element failure' }),
          i18n.t('aiDoctor.causeExhaustLeak', { defaultValue: 'Exhaust manifold leak upstream of sensor' }),
          i18n.t('aiDoctor.causeHarness', { defaultValue: 'Damaged wiring harness connector' })
        ],
        recommendedSteps: [
          i18n.t('aiDoctor.stepCheckWiring', { defaultValue: 'Inspect O2 sensor wiring harness for melting or fraying.' }),
          i18n.t('aiDoctor.stepCleanSensor', { defaultValue: 'Clean O2 sensor tip or replace sensor if resistance out of spec.' })
        ],
        estimatedCostRange: '$60 - $140',
        canDriveSafetyText: i18n.t('aiDoctor.warningDrive', { defaultValue: 'Safe to drive to repair shop at moderate speed.' })
      };
    }

    return {
      riskLevel,
      riskScore,
      title: i18n.t('aiDoctor.genericTitle', { defaultValue: `Diagnostic Code Analysis (${codes})` }),
      summary: i18n.t('aiDoctor.genericSummary', { defaultValue: `Active trouble code(s) detected: ${codes}. System monitoring recommended.` }),
      causes: [
        i18n.t('aiDoctor.causeGeneric1', { defaultValue: 'Sensor circuit out of expected voltage range' }),
        i18n.t('aiDoctor.causeGeneric2', { defaultValue: 'Loose electrical connection or ground fault' })
      ],
      recommendedSteps: [
        i18n.t('aiDoctor.stepGeneric1', { defaultValue: 'Perform diagnostic scan and record freeze frame data.' }),
        i18n.t('aiDoctor.stepGeneric2', { defaultValue: 'Clear DTC codes after inspecting harness connectors.' })
      ],
      estimatedCostRange: '$30 - $120',
      canDriveSafetyText: i18n.t('aiDoctor.warningDrive', { defaultValue: 'Safe to drive to repair shop at moderate speed.' })
    };
  }
}
