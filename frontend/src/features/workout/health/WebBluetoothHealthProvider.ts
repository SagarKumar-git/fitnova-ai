import type { IHealthProvider, ProviderLifecycleState } from './IHealthProvider.ts';
import type { ComprehensiveHealthDataset, NormalizedHealthSignal } from './healthTypes.ts';

export class WebBluetoothHealthProvider implements IHealthProvider {
  readonly providerName = 'web_bluetooth_hr';
  
  private _state: ProviderLifecycleState = 'unavailable';
  private listeners: Set<(state: ProviderLifecycleState) => void> = new Set();
  
  private device: any = null;
  private server: any = null;
  private hrCharacteristic: any = null;
  
  private currentHeartRate: number | null = null;
  private lastHeartRateTimestamp: number | null = null;
  private realTimeListeners: Set<(dataset: Partial<ComprehensiveHealthDataset>) => void> = new Set();

  get state(): ProviderLifecycleState {
    return this._state;
  }

  private setState(newState: ProviderLifecycleState) {
    if (this._state === newState) return;
    this._state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  onStateChange(listener: (state: ProviderLifecycleState) => void): void {
    this.listeners.add(listener);
  }

  offStateChange(listener: (state: ProviderLifecycleState) => void): void {
    this.listeners.delete(listener);
  }

  onRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void {
    this.realTimeListeners.add(listener);
  }

  offRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void {
    this.realTimeListeners.delete(listener);
  }

  async isAvailable(): Promise<boolean> {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') return;
    this.setState('connecting');

    try {
      if (!await this.isAvailable()) {
        throw new Error('Web Bluetooth is not available in this browser.');
      }

      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      if (!this.device.gatt) {
        throw new Error('Device does not support GATT');
      }

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService('heart_rate');
      this.hrCharacteristic = await service.getCharacteristic('heart_rate_measurement');
      
      await this.hrCharacteristic.startNotifications();
      this.hrCharacteristic.addEventListener('characteristicvaluechanged', this.handleHeartRateMeasurement);
      
      this.setState('connected');
    } catch (error) {
      console.error('Failed to connect to Web Bluetooth HR monitor:', error);
      // Clean up any partially registered listeners or handles
      if (this.hrCharacteristic) {
        try {
          (this.hrCharacteristic as { removeEventListener: (type: string, listener: unknown) => void }).removeEventListener(
            'characteristicvaluechanged',
            this.handleHeartRateMeasurement
          );
        } catch {}
        this.hrCharacteristic = null;
      }
      if (this.device) {
        try {
          (this.device as { removeEventListener: (type: string, listener: unknown) => void }).removeEventListener(
            'gattserverdisconnected',
            this.handleDisconnect
          );
        } catch {}
        this.device = null;
      }
      this.server = null;
      this.setState('error');
      throw error;
    }
  }

  private handleDisconnect = () => {
    const wasAlreadyDisconnected = this._state === 'disconnected';
    this.currentHeartRate = null;
    this.lastHeartRateTimestamp = null;

    if (this.hrCharacteristic) {
      try {
        (this.hrCharacteristic as { removeEventListener: (type: string, listener: unknown) => void }).removeEventListener(
          'characteristicvaluechanged',
          this.handleHeartRateMeasurement
        );
      } catch {}
      this.hrCharacteristic = null;
    }
    if (this.device) {
      try {
        (this.device as { removeEventListener: (type: string, listener: unknown) => void }).removeEventListener(
          'gattserverdisconnected',
          this.handleDisconnect
        );
      } catch {}
      this.device = null;
    }
    this.server = null;

    if (!wasAlreadyDisconnected) {
      this.setState('disconnected');
      const unavailableSignal = this.createUnavailableSignal();
      this.realTimeListeners.forEach(l => l({ heartRate: unavailableSignal }));
    }
  };

  private handleHeartRateMeasurement = (event: any) => {
    const characteristic = event.target;
    const value = characteristic?.value;
    if (!value || value.byteLength < 2) return;

    // Parse GATT heart rate measurement
    const flags = value.getUint8(0);
    const hr16Bit = flags & 0x01;
    let heartRate: number;
    
    if (hr16Bit) {
      if (value.byteLength < 3) return;
      heartRate = value.getUint16(1, /* littleEndian= */ true);
    } else {
      heartRate = value.getUint8(1);
    }

    // Physiological Validation (30 - 220 BPM)
    if (isNaN(heartRate) || heartRate < 30 || heartRate > 220) {
      return; // Ignore invalid values
    }

    this.currentHeartRate = heartRate;
    this.lastHeartRateTimestamp = Date.now();
    
    // Dispatch to real-time listeners
    const hrSignal: NormalizedHealthSignal<number> = {
      value: this.currentHeartRate,
      capturedAt: this.lastHeartRateTimestamp,
      source: this.providerName,
      freshness: 'fresh',
      confidence: 0.99,
    };
    
    this.realTimeListeners.forEach(l => l({ heartRate: hrSignal }));
  };

  async disconnect(): Promise<void> {
    if (this.hrCharacteristic) {
      try {
        (this.hrCharacteristic as { removeEventListener: (type: string, listener: unknown) => void }).removeEventListener(
          'characteristicvaluechanged',
          this.handleHeartRateMeasurement
        );
      } catch {}
      try {
        await this.hrCharacteristic.stopNotifications();
      } catch (e) {
        console.error('Failed to stop notifications', e);
      }
    }
    if (this.device && this.device.gatt?.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (e) {
        console.error('Failed to disconnect GATT', e);
      }
    }
    this.handleDisconnect();
  }

  private createUnavailableSignal(): NormalizedHealthSignal<number> {
    return {
      value: 0,
      capturedAt: Date.now(),
      source: this.providerName,
      freshness: 'unavailable',
      confidence: 0,
    };
  }

  async getComprehensiveDataset(): Promise<ComprehensiveHealthDataset> {
    if (this._state !== 'connected' && this._state !== 'syncing') {
      throw new Error('Web Bluetooth provider is not connected.');
    }
    
    const previousState = this._state;
    this.setState('syncing');
    try {
      const now = Date.now();
      const isHrFresh = Boolean(this.currentHeartRate && this.lastHeartRateTimestamp && (now - this.lastHeartRateTimestamp < 10000));
      
      // Web Bluetooth HR monitor only provides heart rate natively.
      return {
        hrv: this.createUnavailableSignal(),
        restingHeartRate: this.createUnavailableSignal(),
        sleepDuration: this.createUnavailableSignal(),
        sleepQuality: this.createUnavailableSignal(),
        recoveryScore: this.createUnavailableSignal(),
        soreness: this.createUnavailableSignal(),
        fatigue: this.createUnavailableSignal(),
        trainingLoad: this.createUnavailableSignal(),
        acuteChronicWorkload: this.createUnavailableSignal(),
        heartRate: {
          value: this.currentHeartRate || 0,
          capturedAt: this.lastHeartRateTimestamp || now,
          source: this.providerName,
          freshness: isHrFresh ? 'fresh' : 'stale',
          confidence: isHrFresh ? 0.99 : 0.2,
        },
        workoutRecoveryTime: this.createUnavailableSignal(),
      };
    } finally {
      if (this._state === 'syncing') {
        this.setState(previousState);
      }
    }
  }
}
