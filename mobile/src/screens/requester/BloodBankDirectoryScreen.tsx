import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { BloodBank, BloodGroup } from '../../constants/types';
import { CONFIG } from '../../constants/config';

export const BloodBankDirectoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBloodBanks = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (selectedGroup !== 'ALL') {
        params.blood_type = selectedGroup;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.bloodBanks.getAll(params);
      if (res.success && Array.isArray(res.blood_banks)) {
        setBloodBanks(res.blood_banks);
      }
    } catch (err: any) {
      console.warn('Error fetching blood banks:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup, searchQuery]);

  useEffect(() => {
    fetchBloodBanks();
  }, [fetchBloodBanks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBloodBanks();
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Searching licensed blood banks and inventory..." />;
  }

  const renderItem = ({ item }: { item: BloodBank }) => {
    return (
      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={20} color={THEME.colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.bankName}>{item.name}</Text>
            <Text style={styles.address} numberOfLines={2}>
              {item.address}, {item.city}
            </Text>
          </View>
          {item.verified && <Badge label="VERIFIED" variant="success" size="sm" />}
        </View>

        {/* Stock Breakdown */}
        {item.available_groups && (
          <View style={styles.stockSection}>
            <Text style={styles.stockLabel}>Stock Availability:</Text>
            <View style={styles.stockGrid}>
              {Object.entries(item.available_groups).map(([group, units]) => {
                const isMatch = selectedGroup !== 'ALL' && selectedGroup === group;
                return (
                  <View
                    key={group}
                    style={[
                      styles.stockPill,
                      isMatch && styles.stockPillMatch,
                      Number(units) === 0 && styles.stockPillZero
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockGroup,
                        isMatch && { color: '#FFFFFF' }
                      ]}
                    >
                      {group}:
                    </Text>
                    <Text
                      style={[
                        styles.stockUnits,
                        isMatch && { color: '#FFFFFF' },
                        Number(units) === 0 && { color: THEME.colors.textLight }
                      ]}
                    >
                      {' '}{units}u
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.footerRow}>
          {item.operating_hours && (
            <View style={styles.hoursRow}>
              <Ionicons name="time-outline" size={14} color={THEME.colors.textMuted} />
              <Text style={styles.hoursText}>{item.operating_hours}</Text>
            </View>
          )}

          <Button
            title={`Call: ${item.phone}`}
            variant="outline"
            size="sm"
            icon={<Ionicons name="call" size={14} color={THEME.colors.primary} />}
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Blood Bank Directory"
        subtitle="Licensed Centers & Live Stock"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.filterSection}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            placeholder="Search by facility name or area..."
            placeholderTextColor={THEME.colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Blood Group Filter Chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['ALL', ...CONFIG.BLOOD_GROUPS]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => {
            const isSelected = selectedGroup === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedGroup(item as any)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={bloodBanks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="No Blood Banks Found"
            description="No blood centers matched your current filter criteria. Try clearing search filters."
            actionTitle="Reset Filters"
            onAction={() => {
              setSelectedGroup('ALL');
              setSearchQuery('');
            }}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  filterSection: {
    paddingHorizontal: THEME.spacing.base,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.navy,
    marginLeft: 8
  },
  chipsScroll: {
    paddingBottom: 8,
    gap: 6
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.round,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  filterChipSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  chipTextSelected: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: THEME.spacing.base
  },
  card: {
    padding: 14,
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  headerInfo: {
    flex: 1
  },
  bankName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  address: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16
  },
  stockSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    marginBottom: 10
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 6
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  stockPill: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  stockPillMatch: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  stockPillZero: {
    opacity: 0.4
  },
  stockGroup: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  stockUnits: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  hoursText: {
    fontSize: 11,
    color: THEME.colors.textMuted
  }
});

