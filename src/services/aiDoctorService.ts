import i18n from '../i18n';

export interface AiDiagnosticContext {
  dtcCodes: string[];
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
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

    // Try AI Gemini API request if key is available in environment
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (apiKey && dtcCount > 0) {
      try {
        const prompt = `You are MotoCortex AI Mechanic. Analyze vehicle diagnostic data and output strict JSON in language code '${lang}'.
Vehicle: ${context.vehicleYear || ''} ${context.vehicleMake || 'Motorcycle/Car'} ${context.vehicleModel || ''}
DTC Codes: ${context.dtcCodes.join(', ')}
Voltage: ${context.engineVoltage || 'N/A'}V, Coolant Temp: ${context.coolantTemp || 'N/A'}°C
Freeze Frame: ${JSON.stringify(context.freezeFrameData || {})}

Return JSON structure:
{
  "title": "Short title",
  "summary": "2 sentence diagnostic summary",
  "causes": ["cause 1", "cause 2"],
  "recommendedSteps": ["step 1", "step 2"],
  "estimatedCostRange": "$50 - $150",
  "canDriveSafetyText": "Advice on whether driving to repair shop is safe"
}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            return {
              riskLevel,
              riskScore,
              title: parsed.title || `DTC Analysis (${context.dtcCodes.join(', ')})`,
              summary: parsed.summary || 'Diagnostic analysis completed.',
              causes: Array.isArray(parsed.causes) ? parsed.causes : [],
              recommendedSteps: Array.isArray(parsed.recommendedSteps) ? parsed.recommendedSteps : [],
              estimatedCostRange: parsed.estimatedCostRange || 'Variable',
              canDriveSafetyText: parsed.canDriveSafetyText || 'Drive with caution to nearest service center.'
            };
          }
        }
      } catch (err) {
        console.warn('[AiDoctorService] Remote AI API call failed or timed out. Falling back to local offline engine:', err);
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
        title: i18n.t('aiDoctor.o2Title', { defaultValue: 'Oxygen (O2) Sensor Circuit Malfunction' }),
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
