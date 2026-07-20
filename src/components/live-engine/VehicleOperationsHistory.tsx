import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getVehicleOperations, VehicleOperation } from '../../store/garageStore';

function parseTurkishDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(' ');
  if (parts.length < 4) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10);
  const timePart = parts[3];
  
  const trMonths: Record<string, number> = {
    ocak: 0, subat: 1, şubat: 1, mart: 2, nisan: 3, mayis: 4, mayıs: 4, haziran: 5,
    temmuz: 6, agustos: 7, ağustos: 7, eylul: 8, eylül: 8, ekim: 9, kasim: 10, kasım: 10, aralik: 11, aralık: 11
  };
  
  const month = trMonths[monthStr];
  if (month === undefined || isNaN(day) || isNaN(year)) return null;
  
  const [hour, minute] = timePart.split(':').map(x => parseInt(x, 10));
  if (isNaN(hour) || isNaN(minute)) {
    return new Date(year, month, day);
  }
  return new Date(year, month, day, hour, minute);
}

interface VehicleOperationsHistoryProps {
  vin?: string;
  colors: any;
  scaleFont: (size: number) => number;
  MONO: string;
  appLocale: string;
}

export default function VehicleOperationsHistory({
  vin,
  colors,
  scaleFont,
  MONO,
  appLocale,
}: VehicleOperationsHistoryProps) {
  const { t } = useTranslation();
  const [operations, setOperations] = React.useState<VehicleOperation[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (vin) {
      getVehicleOperations(vin).then(setOperations);
    }
  }, [vin]);

  if (!vin || operations.length === 0) return null;

  return (
    <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: `${colors.textPri}0D`, paddingTop: 6 }}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)} 
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 }}
        activeOpacity={0.4}
      >
        <Text style={{ color: colors.cyan, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: 'bold' }}>
          📋 {t('common.operations', 'OPERATIONS').toUpperCase()} ({operations.length})
        </Text>
        <Text style={{ color: colors.cyan, fontSize: scaleFont(8.5), fontFamily: MONO, fontWeight: 'bold' }}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={{ marginTop: 2, paddingStart: 4 }}>
          {operations.map((op, idx) => {
            let dateObj: Date | null = op.timestamp ? new Date(op.timestamp) : null;
            if (!dateObj && op.dateString) {
              dateObj = parseTurkishDate(op.dateString);
            }
            const displayDate = dateObj ? dateObj.toLocaleDateString(appLocale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : op.dateString;

            const opName = op.type === 'clear_dtc' 
              ? t('vehicleSelect.operations.clearDtc', 'Fault Codes Cleared')
              : op.type === 'fuel_adaptation'
                ? t('vehicleSelect.operations.fuelAdaptation', 'Fuel Adaptation')
                : t('vehicleSelect.operations.ecuReset', 'ECU Reset');

            return (
              <Text key={idx} style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO, marginTop: 2 }}>
                • {displayDate} - {opName}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}
