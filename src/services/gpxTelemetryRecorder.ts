import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface TelemetryPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  speedKmh?: number;
  rpm?: number;
  leanAngle?: number;
}

/**
 * Service to record and export Track/Touring telemetries to GPX format.
 */
export class GpxTelemetryRecorder {
  private static isRecording = false;
  private static points: TelemetryPoint[] = [];
  private static MAX_POINTS = 5000; // Ring buffer cap to prevent Hermes JS heap Out-Of-Memory

  public static startSession(): void {
    this.isRecording = true;
    this.points = [];
  }

  public static addPoint(point: TelemetryPoint): void {
    if (!this.isRecording) return;

    if (this.points.length >= this.MAX_POINTS) {
      this.points.shift(); // Evict oldest point to keep RAM footprint bounded
    }
    this.points.push(point);
  }

  public static stopSession(): TelemetryPoint[] {
    this.isRecording = false;
    return [...this.points];
  }

  public static getSessionPoints(): TelemetryPoint[] {
    return this.points;
  }

  /**
   * Generates a valid GPX 1.1 XML string from recorded telemetry points.
   */
  public static exportToGpxString(sessionTitle = 'MotoCortex Ride Telemetry'): string {
    const trkpts = this.points.map(p => {
      const timeStr = new Date(p.timestamp).toISOString();
      const eleXml = p.altitude !== undefined ? `<ele>${p.altitude.toFixed(1)}</ele>` : '';
      const speedXml = p.speedKmh !== undefined ? `<speed>${(p.speedKmh / 3.6).toFixed(2)}</speed>` : '';

      return `      <trkpt lat="${p.latitude.toFixed(6)}" lon="${p.longitude.toFixed(6)}">
        ${eleXml}
        <time>${timeStr}</time>
        ${speedXml}
        <extensions>
          <motocortex:rpm>${p.rpm || 0}</motocortex:rpm>
          <motocortex:leanAngle>${p.leanAngle || 0}</motocortex:leanAngle>
        </extensions>
      </trkpt>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MotoCortex Telemetry Studio" xmlns="http://www.topografix.com/GPX/1/1" xmlns:motocortex="http://motocortex.app/gpx/1.0">
  <metadata>
    <name>${sessionTitle}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${sessionTitle}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
  }

  /**
   * Saves GPX to temporary file system and triggers OS share dialog.
   */
  public static async exportAndShareGpx(sessionTitle = 'MotoCortex Ride'): Promise<void> {
    const xml = this.exportToGpxString(sessionTitle);
    const fileName = `MotoCortex_Track_${Date.now()}.gpx`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, xml, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/gpx+xml',
        dialogTitle: 'Share MotoCortex Track Telemetry (GPX)',
        UTI: 'com.topografix.gpx',
      });
    }
  }
}
