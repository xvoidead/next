import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '../settings/SettingsProvider';
import { Text } from './kit';
import { fonts } from './theme';

type Props = {
  visible: boolean;
  groups: string[];
  selected: string | null;
  loading?: boolean;
  onSelect: (group: string) => void;
  onClose: () => void;
};

export function GroupPicker({ visible, groups, selected, loading, onSelect, onClose }: Props) {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.replace(/\s+/g, '');
    const sorted = [...groups].sort((a, b) => a.localeCompare(b));
    return q ? sorted.filter((g) => g.includes(q)) : sorted;
  }, [groups, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={close}
    >
      <View
        style={[styles.container, { backgroundColor: theme.bg, paddingTop: Platform.OS === 'ios' ? 20 : insets.top + 12 }]}
      >
        <View style={styles.header}>
          <Text variant="title">{t('chooseGroup')}</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text variant="subtitle" color={theme.primary}>
              {t('done')}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('groupSearch')}
            placeholderTextColor={theme.textFaint}
            keyboardType="number-pad"
            style={[styles.searchInput, { color: theme.text, fontFamily: fonts.regular }]}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(g) => g}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              {loading ? <ActivityIndicator color={theme.primary} /> : null}
              <Text muted style={{ textAlign: 'center' }}>
                {groups.length === 0 ? t('groupListLater') : t('nothingFound')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = item === selected;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  close();
                }}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: active ? theme.primarySoft : theme.card, borderColor: theme.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="users" size={18} color={active ? theme.primary : theme.textMuted} />
                <Text variant="subtitle" color={active ? theme.primary : theme.text} style={{ flex: 1 }}>
                  {item.split(',').join(', ')}
                </Text>
                {active ? <Feather name="check" size={18} color={theme.primary} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  search: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', marginTop: 40, gap: 12, paddingHorizontal: 24 },
});
