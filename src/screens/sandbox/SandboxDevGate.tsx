import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DashboardSandbox from './DashboardSandbox';

/**
 * Development-only entry point for the decoupled diagnostic core.
 *
 * Renders nothing in production (`__DEV__` guard). In a development build it shows a
 * floating "DIAG" button that opens the isolated DashboardSandbox in a full-screen modal.
 *
 * The sandbox is mounted only while the modal is open, so closing it unmounts
 * DashboardSandbox -> useDiagnosticEngine cleanup -> OBD2ProtocolEngine.destroy() +
 * BluetoothManager.disconnect(), guaranteeing a clean resource release every time.
 */
export default function SandboxDevGate(): React.ReactElement | null {
  const [open, setOpen] = useState(false);

  if (!__DEV__) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        testID="sandbox-dev-fab"
      >
        <Text style={styles.fabText}>DIAG</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.closeBar} onPress={() => setOpen(false)} testID="sandbox-dev-close">
            <Text style={styles.closeText}>✕  Close Diagnostic Sandbox</Text>
          </TouchableOpacity>
          {open ? <DashboardSandbox /> : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    backgroundColor: '#4FD1C5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 9999,
  },
  fabText: { color: '#0B0E11', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  modalRoot: { flex: 1, backgroundColor: '#0B0E11' },
  closeBar: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#141A21' },
  closeText: { color: '#E6F1FF', fontSize: 15, fontWeight: '600' },
});
