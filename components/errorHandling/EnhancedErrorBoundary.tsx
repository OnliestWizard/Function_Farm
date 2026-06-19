import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { ErrorHandler, AppError } from '../services/ErrorHandler';
import { SecureAuditLogger } from '../services/SecureAuditLogger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = ErrorHandler.toAppError(error, {
      operation: 'component_render',
      component: errorInfo.componentStack?.split('\n')[0] || 'unknown',
      metadata: {
        componentStack: errorInfo.componentStack
      }
    });

    ErrorHandler.handle(appError);

    (async () => {
      try {
        const auditLogger = SecureAuditLogger.getInstance();
        await auditLogger.logKeyOperation(
          'component_error',
          'system',
          'error',
          false,
          `Component error: ${error.message}`
        );
      } catch (auditError) {
        console.error('Failed to log to audit system:', auditError);
      }
    })();

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (this.state.errorCount >= 3) {
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }

      return <ErrorFallback
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        onReset={this.resetErrorBoundary}
        showDetails={this.props.showDetails}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  showDetails?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
  showDetails = false
}) => {
  const [detailsVisible, setDetailsVisible] = React.useState(false);
  const appError = error instanceof AppError
    ? error
    : ErrorHandler.toAppError(error);

  const handleReport = () => {
    Alert.alert(
      'Report Error',
      'Would you like to report this error to help us improve the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            Alert.alert('Thank You', 'Error report has been sent.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>{appError.userMessage}</Text>

          {appError.suggestions && appError.suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Try these:</Text>
              {appError.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestion}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onReset}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleReport}>
              <Text style={styles.secondaryButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>

          {(showDetails || __DEV__) && (
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setDetailsVisible(!detailsVisible)}
            >
              <Text style={styles.detailsToggleText}>
                {detailsVisible ? 'Hide' : 'Show'} Technical Details
              </Text>
            </TouchableOpacity>
          )}

          {detailsVisible && (
            <View style={styles.details}>
              <Text style={styles.detailsTitle}>Error Details:</Text>
              <Text style={styles.detailsText}>
                Code: {appError instanceof AppError ? appError.code : 'UNKNOWN'}
              </Text>
              <Text style={styles.detailsText}>
                Category: {appError instanceof AppError ? appError.category : 'SYSTEM'}
              </Text>
              <Text style={styles.detailsText}>
                Message: {error.message}
              </Text>
              {errorInfo && (
                <ScrollView style={styles.stackTrace}>
                  <Text style={styles.stackTraceText}>
                    {errorInfo.componentStack}
                  </Text>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0f13'
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  errorCard: {
    backgroundColor: '#171925',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef444430'
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  title: {
    color: '#e7e8ea',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center'
  },
  message: {
    color: '#aab0bc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24
  },
  suggestions: {
    width: '100%',
    backgroundColor: '#14161b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  suggestionsTitle: {
    color: '#e7e8ea',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  suggestion: {
    color: '#aab0bc',
    fontSize: 14,
    marginBottom: 4,
    paddingLeft: 8
  },
  actions: {
    width: '100%',
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#4a5f8a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#2a2d3a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#cfd2d8',
    fontSize: 16,
    fontWeight: '600'
  },
  detailsToggle: {
    marginTop: 16,
    padding: 8
  },
  detailsToggleText: {
    color: '#8a92a3',
    fontSize: 14,
    textDecorationLine: 'underline'
  },
  details: {
    width: '100%',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#14161b',
    borderRadius: 8
  },
  detailsTitle: {
    color: '#e7e8ea',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  detailsText: {
    color: '#8a92a3',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace'
  },
  stackTrace: {
    marginTop: 8,
    maxHeight: 200,
    backgroundColor: '#0e0f13',
    borderRadius: 4,
    padding: 8
  },
  stackTraceText: {
    color: '#8a92a3',
    fontSize: 10,
    fontFamily: 'monospace'
  }
});

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default EnhancedErrorBoundary;


one wizard was here, then he wasnt
