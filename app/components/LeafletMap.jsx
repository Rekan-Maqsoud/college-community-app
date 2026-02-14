import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { useAppSettings } from '../context/AppSettingsContext';
import { normalize, spacing } from '../utils/responsive';

const resolveWebView = () => {
  try {
    const module = require('react-native-webview');
    return module?.WebView || null;
  } catch (error) {
    return null;
  }
};

const LeafletMap = ({
  markers = [],
  initialRegion,
  userLocation,
  zoom = 15,
  interactive = true,
  onMarkerPress,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const { theme } = useAppSettings();
  const webViewRef = useRef(null);
  const WebViewComponent = useMemo(() => resolveWebView(), []);

  const center = useMemo(() => {
    if (initialRegion && typeof initialRegion.latitude === 'number' && typeof initialRegion.longitude === 'number') {
      return {
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
      };
    }

    if (userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number') {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
    }

    if (markers.length > 0) {
      const firstMarker = markers[0];
      if (typeof firstMarker.latitude === 'number' && typeof firstMarker.longitude === 'number') {
        return {
          latitude: firstMarker.latitude,
          longitude: firstMarker.longitude,
        };
      }
    }

    return { latitude: 0, longitude: 0 };
  }, [initialRegion, userLocation, markers]);

  const serializedMarkers = useMemo(() => JSON.stringify(markers), [markers]);
  const serializedUserLocation = useMemo(() => JSON.stringify(userLocation || null), [userLocation]);

  const html = useMemo(() => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .leaflet-container {
        background: #f3f4f6;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      var initialCenter = ${JSON.stringify(center)};
      var initialZoom = ${JSON.stringify(zoom)};
      var isInteractive = ${JSON.stringify(interactive)};

      var map = L.map('map', {
        zoomControl: isInteractive,
        dragging: isInteractive,
        scrollWheelZoom: isInteractive,
        doubleClickZoom: isInteractive,
        boxZoom: isInteractive,
        keyboard: isInteractive,
        tap: isInteractive,
        attributionControl: false,
      }).setView([initialCenter.latitude, initialCenter.longitude], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      var markerLayer = L.layerGroup().addTo(map);
      var userMarker = null;

      function postMessage(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(payload);
        }
      }

      function renderMarkers(markerData) {
        markerLayer.clearLayers();
        if (!Array.isArray(markerData)) {
          return;
        }

        markerData.forEach(function (item) {
          if (!item || typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
            return;
          }

          var marker = L.marker([item.latitude, item.longitude]).addTo(markerLayer);
          if (item.title) {
            marker.bindPopup(item.title);
          }
          marker.on('click', function () {
            postMessage(JSON.stringify({ type: 'marker_press', payload: item }));
          });
        });
      }

      function renderUserLocation(location) {
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          if (userMarker) {
            markerLayer.removeLayer(userMarker);
            userMarker = null;
          }
          return;
        }

        var latLng = [location.latitude, location.longitude];
        if (userMarker) {
          userMarker.setLatLng(latLng);
        } else {
          userMarker = L.circleMarker(latLng, {
            radius: 6,
            color: '#2563EB',
            fillColor: '#3B82F6',
            fillOpacity: 0.9,
          }).addTo(markerLayer);
        }
      }

      var initialMarkers = window.__RN_MARKERS || ${serializedMarkers};
      var initialUserLocation = window.__RN_USER_LOCATION || ${serializedUserLocation};
      renderMarkers(initialMarkers);
      renderUserLocation(initialUserLocation);

      window.__RN_UPDATE = function (nextMarkers, nextUserLocation) {
        renderMarkers(nextMarkers);
        renderUserLocation(nextUserLocation);
      };
    </script>
  </body>
</html>`, [center, zoom, interactive, serializedMarkers, serializedUserLocation]);

  const injectedBeforeContentLoaded = useMemo(() => {
    return `window.__RN_MARKERS = ${serializedMarkers}; window.__RN_USER_LOCATION = ${serializedUserLocation}; true;`;
  }, [serializedMarkers, serializedUserLocation]);

  const handleShouldStartLoadWithRequest = useCallback((request) => {
    const url = request?.url || '';
    if (!url) {
      return false;
    }

    if (url === 'about:blank') {
      return true;
    }

    return url.startsWith('https://unpkg.com/') || /^https:\/\/[a-z]\.tile\.openstreetmap\.org\//.test(url);
  }, []);

  useEffect(() => {
    if (!webViewRef.current || !WebViewComponent) {
      return;
    }

    const updateScript = `window.__RN_UPDATE && window.__RN_UPDATE(${serializedMarkers}, ${serializedUserLocation}); true;`;
    webViewRef.current.injectJavaScript(updateScript);
  }, [serializedMarkers, serializedUserLocation]);

  const handleMessage = (event) => {
    if (!onMarkerPress) {
      return;
    }

    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'marker_press') {
        onMarkerPress(data.payload);
      }
    } catch (error) {
      // Ignore malformed messages from the WebView.
    }
  };

  if (!WebViewComponent) {
    return (
      <View
        style={[
          styles.container,
          styles.fallbackContainer,
          { backgroundColor: theme.backgroundSecondary },
          containerStyle,
        ]}
      >
        <Text style={[styles.fallbackTitle, { color: theme.text }]}>
          {t('chats.mapUnavailableTitle')}
        </Text>
        <Text style={[styles.fallbackMessage, { color: theme.textSecondary }]}>
          {t('chats.mapUnavailableMessage')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <WebViewComponent
        ref={webViewRef}
        originWhitelist={['about:blank', 'https://unpkg.com/*', 'https://*.tile.openstreetmap.org/*']}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="never"
        injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
        setSupportMultipleWindows={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  fallbackTitle: {
    fontSize: normalize(16),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  fallbackMessage: {
    fontSize: normalize(13),
    textAlign: 'center',
  },
});

export default LeafletMap;
