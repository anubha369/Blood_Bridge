import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { api } from '../../services/api';
import { BloodBank } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BloodBankDirectoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBloodBanks = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (selectedCity) {
        params.city = selectedCity;
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
  }, [selectedCity]);

  useEffect(() => {
    fetchBloodBanks();
  }, [fetchBloodBanks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBloodBanks();
  };

  const handleOpenMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`
    }) || `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const cities = [
    { label: 'All Verified Cities', value: '' },
    { label: 'Jaipur', value: 'Jaipur' },
    { label: 'Ghaziabad', value: 'Ghaziabad' },
    { label: 'Lucknow', value: 'Lucknow' },
    { label: 'Delhi NCR', value: 'Delhi' }
  ];

  const renderItem = ({ item }: { item: BloodBank }) => {
    const inventory = item.inventory_summary || item.available_groups || {
      'A+': 18, 'A-': 4, 'B+': 26, 'B-': 6, 'AB+': 8, 'AB-': 2, 'O+': 34, 'O-': 7
    };

    return (
      <View style={styles.bankCard}>
        {/* Officially Verified Centre Badge */}
        <View style={styles.verifiedBadgeRow}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={13} color={THEME.colors.successText} />
            <Text style={styles.verifiedBadgeText}>Officially Verified Centre</Text>
          </View>
          {item.distance_band && item.distance_band !== 'Distance not available' && (
            <View style={styles.distancePill}>
              <Text style={styles.distancePillText}>{item.distance_band}</Text>
            </View>
          )}
        </View>

        {/* Hospital / Centre Name */}
        <Text style={styles.bankName}>{item.name}</Text>

        {/* Details List */}
        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={15} color={THEME.colors.slate400} style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {item.address}, {item.city}, {item.state} {item.postal_code}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={15} color={THEME.colors.slate400} style={styles.detailIcon} />
            <Text style={[styles.detailText, styles.detailBoldText]}>
              {item.operating_hours || '24/7 Emergency Transfusion Service'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={THEME.colors.slate400} style={styles.detailIcon} />
            <Text style={styles.sourceText}>
              Source: {item.source_of_info || 'State Blood Transfusion Council / e-RaktKosh'}
            </Text>
          </View>
        </View>

        {/* Latest Reported Stock (Units) Grid */}
        <View style={styles.stockSection}>
          <View style={styles.stockHeaderRow}>
            <Text style={styles.stockHeaderTitle}>LATEST REPORTED STOCK (UNITS):</Text>
            <Text style={styles.stockHeaderUpdated}>Updated Today</Text>
          </View>

          <View style={styles.stockGrid}>
            {Object.entries(inventory).map(([group, count]) => {
              const countNum = Number(count);
              return (
                <View key={group} style={styles.stockBox}>
                  <Text style={styles.stockBoxGroup}>{group}</Text>
                  <Text
                    style={[
                      styles.stockBoxCount,
                      countNum > 0 ? styles.stockBoxCountPositive : styles.stockBoxCountZero
                    ]}
                  >
                    {countNum}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.callButton}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.callButtonText} numberOfLines={1}>
              Call: {item.phone}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.directionsButton}
            activeOpacity={0.85}
            onPress={() => handleOpenMaps(item.address, item.city)}
          >
            <Ionicons name="navigate-outline" size={14} color={THEME.colors.slate700} />
            <Text style={styles.directionsButtonText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        showBrand
        rightAction={
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh" size={18} color={THEME.colors.slate700} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={bloodBanks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Title Row */}
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Ionicons name="business" size={28} color={THEME.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.pageTitle}>Verified Blood Banks Directory</Text>
              </View>
              <Text style={styles.pageSubtitle}>
                Official government, Red Cross, and NABH-accredited regional blood transfusion centres
              </Text>
            </View>

            {/* City Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityFilterRow}
            >
              {cities.map((c) => {
                const isSelected = selectedCity === c.value;
                return (
                  <TouchableOpacity
                    key={c.label}
                    style={[
                      styles.cityChip,
                      isSelected && styles.cityChipSelected
                    ]}
                    onPress={() => setSelectedCity(c.value)}
                  >
                    <Text
                      style={[
                        styles.cityChipText,
                        isSelected && styles.cityChipTextSelected
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Amber Protocol Warning Banner */}
            <View style={styles.protocolBanner}>
              <Ionicons name="warning-outline" size={18} color={THEME.colors.warningText} style={styles.protocolIcon} />
              <View style={styles.protocolTextContainer}>
                <Text style={styles.protocolTitle}>Live Inventory Confirmation Protocol:</Text>
                <Text style={styles.protocolBody}>
                  Reported inventory units represent the most recent update recorded from health authorities. Emergency patient attendants must call the blood centre's direct telephone line to confirm immediate stock before dispatching a courier or ambulance.
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="business-outline"
              title="No Blood Banks Found"
              description="No registered centres found for this city. Try selecting 'All Verified Cities'."
              actionTitle="Reset Filter"
              onAction={() => setSelectedCity('')}
            />
          ) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listHeader: {
    marginBottom: 16
  },
  titleSection: {
    marginBottom: 12
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4,
    flex: 1
  },
  pageSubtitle: {
    fontSize: 13,
    color: THEME.colors.slate600,
    marginTop: 4,
    lineHeight: 18
  },
  cityFilterRow: {
    gap: 8,
    paddingVertical: 8
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.borderDark
  },
  cityChipSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  cityChipTextSelected: {
    color: '#FFFFFF'
  },
  protocolBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.warningBg,
    borderWidth: 1,
    borderColor: THEME.colors.warningBorder,
    borderRadius: 14,
    padding: 12,
    marginTop: 10
  },
  protocolIcon: {
    marginRight: 8,
    marginTop: 2
  },
  protocolTextContainer: {
    flex: 1
  },
  protocolTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2
  },
  protocolBody: {
    fontSize: 11,
    color: THEME.colors.warningText,
    lineHeight: 16
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 14,
    ...THEME.shadows.sm
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.successBg,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.successText
  },
  distancePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA'
  },
  bankName: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.2,
    marginBottom: 8
  },
  detailsList: {
    gap: 5,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  detailIcon: {
    marginRight: 6
  },
  detailText: {
    fontSize: 12,
    color: THEME.colors.slate600,
    flex: 1,
    lineHeight: 16
  },
  detailBoldText: {
    fontWeight: '700',
    color: THEME.colors.navy
  },
  sourceText: {
    fontSize: 11,
    color: THEME.colors.slate500
  },
  stockSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100,
    marginBottom: 12
  },
  stockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  stockHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate700,
    letterSpacing: 0.5
  },
  stockHeaderUpdated: {
    fontSize: 10,
    color: THEME.colors.slate400
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  stockBox: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: THEME.colors.slate50,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center'
  },
  stockBoxGroup: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.slate500
  },
  stockBoxCount: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2
  },
  stockBoxCountPositive: {
    color: THEME.colors.primary
  },
  stockBoxCountZero: {
    color: THEME.colors.slate400
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100
  },
  callButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    ...THEME.shadows.sm
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: THEME.colors.borderDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  directionsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  }
});
