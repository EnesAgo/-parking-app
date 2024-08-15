import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Updates from 'expo-updates';
import { Camera } from 'expo-camera';
import HttpRequest from "../../requests/HttpRequest";

const wait = (timeout) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanType, setScanType] = useState(0)
  const [scannerDisplay, setScannerDisplay] = useState(false)
  const [resData, setResData] = useState('')

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);


  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    wait(2000).then(() => Updates.reloadAsync());
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setScannerDisplay(prev => !prev)


    if(scanType === 0){
      alert(scanType)
      const response = await HttpRequest.get(`/transactions/${data}`)
      setResData(JSON.stringify(data))
      alert(response)
    }

  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }


  return (
      <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
          }
      >

      <SafeAreaView contentContainerStyle={styles.container}>


        {

          scannerDisplay ?

              <View style={styles.cameraContainer}>
                <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={styles.camera}
                />
              </View> :

              <View style={styles.buttonsDiv}>

                <View style={styles.buttons}>
                  <Button title={"Transac"} onPress={() => {setScannerDisplay(prev => !prev);setScanType(0)}} />
                  <Button title={"Reserv"} onPress={() => {setScannerDisplay(prev => !prev);setScanType(1)}}  />
                </View>

                <View style={styles.dataView}>
                  <Text>{resData}</Text>
                </View>

              </View>
        }


      </SafeAreaView>

      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    height:"100%",
    width:"100%"
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonsDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent:"center",
    width: "100%"
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    width: "60%",
    justifyContent:"space-around",
    margin:10
  },
  dataView: {
    width: 250,
    height: 300,
    // backgroundColor: "#030303"
  },
  cameraContainer: {
    width: '80%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 10,
    marginBottom: 40,
  },
  camera: {
    flex: 1,
  },
});
