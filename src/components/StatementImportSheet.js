import { useState } from 'react';
import { View, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Sheet, Btn, T } from './ui';
import { parseStatementCsv } from '../lib/statement';
import { decryptAndParseXlsx } from '../lib/xlsxStatement';
import { getStatementPassword } from '../store';

const XLSX_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // some pickers report .xlsx as this too
];

// One of the two ways to add a transaction (see TransactionsScreen's "Add a
// transaction" chooser) — upload a CSV or password-protected XLSX statement
// and hand normalized rows back for review. Both parse entirely on-device;
// nothing about the file or its password ever leaves the phone (see
// src/lib/xlsxStatement.js), using the password saved once in the Account
// tab (StatementImportSheet never asks for it).
export default function StatementImportSheet({ visible, onClose, onImported }) {
  const [error, setError] = useState('');

  const uploadStatement = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', ...XLSX_TYPES],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    const isXlsx = /\.xlsx?$/i.test(asset.name || '') || XLSX_TYPES.includes(asset.mimeType);

    try {
      if (isXlsx) {
        const password = await getStatementPassword();
        if (!password) { setError('No statement password saved yet — set one in the Account tab first.'); return; }

        const bytes = await new File(asset).bytes();
        const { rows, warnings } = await decryptAndParseXlsx(bytes, password);
        if (rows.length === 0) { setError('No transactions could be read from that file — check the password in the Account tab.'); return; }
        onImported(rows, warnings);
      } else {
        const text = await new File(asset).text();
        const { rows, warnings } = parseStatementCsv(text);
        if (rows.length === 0) { setError('No transactions could be read from that file.'); return; }
        onImported(rows, warnings);
      }
    } catch (e) {
      setError(/password/i.test(e.message || '') ? 'Wrong statement password — update it in the Account tab.' : 'Could not read that file.');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={T.h3}>From a bank statement</Text>
      <Text style={T.hint}>
        Export a CSV or password-protected XLSX statement from your bank's netbanking. You'll review
        every row before anything is added.
      </Text>

      <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
        <Btn label="Cancel" onPress={onClose} />
        <Btn label="Choose file" kind="dark" onPress={uploadStatement} />
      </View>
      <Text style={T.err}>{error}</Text>
    </Sheet>
  );
}
