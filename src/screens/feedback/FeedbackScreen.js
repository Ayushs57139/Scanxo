import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../../utils/storage';
import colors from '../../constants/colors';
import { StorageKeys } from '../../utils/storage';
import { feedbackAPI } from '../../services/api';

const FeedbackScreen = ({ navigation }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadUserAndHistory();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndHistory();
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  const loadUserAndHistory = async () => {
    try {
      setLoadingHistory(true);
      
      // Set loading to false after max 2 seconds to show screen immediately
      const loadingTimeout = setTimeout(() => {
        setLoadingHistory(false);
      }, 2000);
      
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = userData; // storage.getItem already parses JSON
        const currentUserId = user.id || user.phone || 'default';
        setUserId(currentUserId);
        
        if (currentUserId && currentUserId !== 'default') {
          try {
            const history = await feedbackAPI.getByUserId(currentUserId);
            clearTimeout(loadingTimeout);
            setFeedbackHistory(history || []);
            setLoadingHistory(false);
          } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error loading feedback history:', error);
            setFeedbackHistory([]);
            setLoadingHistory(false);
          }
        } else {
          clearTimeout(loadingTimeout);
          setFeedbackHistory([]);
          setLoadingHistory(false);
        }
      } else {
        clearTimeout(loadingTimeout);
        setFeedbackHistory([]);
        setLoadingHistory(false);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }

    if (!userId || userId === 'default') {
      Alert.alert('Error', 'Please login to submit feedback');
      return;
    }

    try {
      setLoading(true);
      await feedbackAPI.create({
        userId,
        subject: subject.trim() || 'General Feedback',
        message: message.trim(),
        rating,
        status: 'pending',
      });
      
      Alert.alert('Success', 'Thank you for your feedback! We will review it soon.');
      setSubject('');
      setMessage('');
      setRating(5);
      await loadUserAndHistory();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'responded':
        return colors.success;
      case 'pending':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Feedback Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Your Feedback</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Subject (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subject"
              placeholderTextColor={colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Icon
                    name={star <= rating ? 'star' : 'star-border'}
                    size={32}
                    color={star <= rating ? '#FFC107' : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your feedback message"
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="send" size={20} color={colors.white} />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Feedback History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Your Feedback History</Text>
          
          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : feedbackHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="feedback" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No feedback submitted yet</Text>
              <Text style={styles.emptySubtext}>
                Your feedback helps us improve our service
              </Text>
            </View>
          ) : (
            feedbackHistory.map((item) => (
              <View key={item.id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackHeaderLeft}>
                    <Text style={styles.feedbackSubject}>{item.subject || 'General Feedback'}</Text>
                    <View style={styles.ratingDisplay}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name={star <= item.rating ? 'star' : 'star-border'}
                          size={16}
                          color={star <= item.rating ? '#FFC107' : colors.textSecondary}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.feedbackMessage}>{item.message}</Text>
                <Text style={styles.feedbackDate}>{formatDate(item.createdAt)}</Text>
                {item.response && (
                  <View style={styles.responseContainer}>
                    <Text style={styles.responseLabel}>Response:</Text>
                    <Text style={styles.responseText}>{item.response}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    paddingTop: 50,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  historySection: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  feedbackCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  feedbackHeaderLeft: {
    flex: 1,
  },
  feedbackSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  ratingDisplay: {
    flexDirection: 'row',
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  responseContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default FeedbackScreen;

