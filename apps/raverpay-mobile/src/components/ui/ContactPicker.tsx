// src/components/ui/ContactPicker.tsx
import { useTheme } from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Contacts from "expo-contacts";
import React, { useState } from "react";
import { ActivityIndicator, Alert, TouchableOpacity, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { Card } from "./Card";
import { Input } from "./Input";
import { Text } from "./Text";

interface ContactPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (phoneNumber: string) => void;
}

export function ContactPicker({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerProps) {
  const { isDark } = useTheme();
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load contacts when modal becomes visible
  React.useEffect(() => {
    if (visible && deviceContacts.length === 0) {
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Filter contacts when search query changes
  React.useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(deviceContacts);
    } else {
      const query = searchQuery.toLowerCase().trim();

      // Remove non-alphanumeric characters from query for phone search
      const numericQuery = query.replace(/\D/g, "");

      const filtered = deviceContacts.filter((contact) => {
        // Search in name, firstName, lastName, middleName
        const name = (contact.name || "").toLowerCase();
        const firstName = (contact.firstName || "").toLowerCase();
        const lastName = (contact.lastName || "").toLowerCase();
        const middleName = (contact.middleName || "").toLowerCase();

        const nameMatch =
          name.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query) ||
          middleName.includes(query);

        // Search in phone numbers (only if query has numbers)
        let hasMatchingPhone = false;
        if (numericQuery.length > 0) {
          const phoneNumbers = contact.phoneNumbers || [];
          hasMatchingPhone = phoneNumbers.some((phone: any) => {
            const phoneNumber = (phone.number || phone.digits || "").replace(
              /\D/g,
              ""
            );
            return phoneNumber.includes(numericQuery);
          });
        }

        return nameMatch || hasMatchingPhone;
      });

      setFilteredContacts(filtered);
    }
  }, [searchQuery, deviceContacts]);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to contacts to use this feature"
        );
        onClose();
        return;
      }

      setIsLoadingContacts(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length === 0) {
        Alert.alert("No Contacts", "No contacts found on your device");
        setIsLoadingContacts(false);
        return;
      }

      // Find contacts with phone numbers
      const contactsWithPhones = data.filter(
        (contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0
      );

      if (contactsWithPhones.length === 0) {
        Alert.alert("No Phone Numbers", "No contacts with phone numbers found");
        setIsLoadingContacts(false);
        return;
      }

      // Sort contacts alphabetically by name
      const sortedContacts = contactsWithPhones.sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA.localeCompare(nameB);
      });

      setDeviceContacts(sortedContacts);
      setFilteredContacts(sortedContacts);
      setIsLoadingContacts(false);
    } catch (error) {
      console.error("Error loading contacts:", error);
      Alert.alert("Error", "Failed to access contacts");
      setIsLoadingContacts(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    // Get the first phone number - try multiple properties
    const firstPhone = contact.phoneNumbers?.[0];
    const rawNumber =
      firstPhone?.number || firstPhone?.digits || firstPhone?.stringValue || "";

    // Extract only digits
    const phoneNumber = rawNumber.replace(/\D/g, "");

    // Normalize phone number (remove country code if present)
    let normalized = phoneNumber;
    if (normalized.startsWith("234")) {
      normalized = "0" + normalized.substring(3);
    } else if (normalized.length === 10 && !normalized.startsWith("0")) {
      normalized = "0" + normalized;
    }

    // Only use first 11 digits
    normalized = normalized.substring(0, 11);

    if (normalized.length === 11 && normalized.startsWith("0")) {
      onSelectContact(normalized);
      onClose();
      setSearchQuery(""); // Reset search on close
    } else {
      Alert.alert(
        "Invalid Number",
        `Selected contact has an invalid phone number format.\n\nRaw: ${rawNumber}\nNormalized: ${normalized} (${normalized.length} digits)`
      );
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text variant="h3" className="mb-1">
            Select Contact
          </Text>
          <Text variant="caption" color="secondary">
            Choose a contact to autofill their number
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg"
        >
          <Ionicons
            name="close"
            size={24}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {!isLoadingContacts && deviceContacts.length > 0 && (
        <View className="mb-4">
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon="search-outline"
          />
          {searchQuery.trim() && (
            <Text variant="caption" color="secondary" className="mt-1">
              Showing {filteredContacts.length} of {deviceContacts.length}{" "}
              contacts
            </Text>
          )}
        </View>
      )}

      {isLoadingContacts ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color="#5B55F6" />
          <Text variant="body" color="secondary" className="mt-2">
            Loading contacts...
          </Text>
        </View>
      ) : filteredContacts.length === 0 ? (
        <Card variant="elevated" className="p-6">
          <View className="items-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-3">
              <Ionicons
                name="people-outline"
                size={32}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </View>
            <Text variant="body" color="secondary" align="center">
              {searchQuery.trim()
                ? "No contacts found matching your search"
                : "No contacts found"}
            </Text>
          </View>
        </Card>
      ) : (
        <View className="h-[70%]">
          <FlashList
            data={filteredContacts}
            renderItem={({ item: contact }) => {
              const contactName = contact.name || "Unknown";
              const phoneNumber = contact.phoneNumbers?.[0];

              return (
                <TouchableOpacity
                  onPress={() => handleContactSelect(contact)}
                  activeOpacity={0.7}
                >
                  <Card variant="elevated" className="p-4 mb-2 mx-0.5">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                        <Text
                          variant="bodyMedium"
                          weight="semibold"
                          className="text-[#5B55F6]"
                        >
                          {contactName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="ml-3 flex-1">
                        <Text
                          variant="bodyMedium"
                          weight="semibold"
                          numberOfLines={1}
                        >
                          {contactName}
                        </Text>
                        <Text variant="body" color="secondary">
                          {phoneNumber?.number || "No number"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9CA3AF"
                      />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item, index) => `${item.id}-${index}`}
          />
        </View>
      )}
    </BottomSheet>
  );
}
