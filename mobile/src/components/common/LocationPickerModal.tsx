import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MapPin, Search, AlertTriangle } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import { MOCK_LOCATIONS, type LocationPoint } from '../../lib/mockLocations';
import { useLocationSearch } from '../../lib/useLocationSearch';
import { Button } from './Button';

interface LocationPickerModalProps {
  visible: boolean;
  title: string;
  onSelect: (loc: LocationPoint) => void;
  onClose: () => void;
}

// Shared by Home (initial trip planning) and Trip Workspace (editing an in-progress trip) --
// same global search (Nominatim) + Coimbatore carpool-corridor suggestions as the web
// frontend's LocationAutocomplete.
export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  title,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const { results, loading, error } = useLocationSearch(query, visible);

  function handleClose() {
    setQuery('');
    onClose();
  }

  function handleSelect(loc: LocationPoint) {
    setQuery('');
    onSelect(loc);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.searchBox}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search any location -- e.g. Chennai Central"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loading && <ActivityIndicator size="small" color={colors.primaryBright} />}
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {query.trim().length >= 3 ? (
              loading ? (
                <Text style={styles.statusText}>Searching global locations…</Text>
              ) : error ? (
                <View style={styles.errorBox}>
                  <AlertTriangle size={13} color={colors.red} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : results.length > 0 ? (
                results.map((loc) => (
                  <TouchableOpacity key={loc.id} style={styles.item} onPress={() => handleSelect(loc)}>
                    <MapPin size={16} color={colors.primaryBright} />
                    <Text style={styles.itemText} numberOfLines={2}>
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.statusText}>No locations found.</Text>
              )
            ) : (
              <>
                <Text style={styles.statusText}>
                  Suggested (verified carpool corridors) -- or type 3+ characters to search anywhere
                </Text>
                {MOCK_LOCATIONS.map((loc) => (
                  <TouchableOpacity key={loc.id} style={styles.item} onPress={() => handleSelect(loc)}>
                    <MapPin size={16} color={colors.primaryBright} />
                    <Text style={styles.itemText}>{loc.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>

          <Button title="Cancel" variant="glass" onPress={handleClose} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#1E2D24',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textWhite,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textWhite,
    fontSize: 13,
  },
  list: {
    maxHeight: 300,
  },
  statusText: {
    fontSize: 11,
    color: colors.textMuted,
    paddingVertical: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.redSoft,
    borderRadius: radii.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.red,
    marginVertical: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.red,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemText: {
    color: colors.textWhite,
    fontSize: 13,
    flex: 1,
  },
});
