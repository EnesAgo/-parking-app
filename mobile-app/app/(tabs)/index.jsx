import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Pressable, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Updates from 'expo-updates';
import { Camera } from 'expo-camera';
import moment from 'moment-timezone'
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
    // setScanned(true);
    setScannerDisplay(prev => !prev)


    if(scanType === 0){

      try{
        // alert(scanType)
        const response = await HttpRequest.get(`/transactions/${data}`)
        const id = response.data.id
        const leaved = await HttpRequest.put(`/transactions/leave?id=${id}`)
        const newData = await HttpRequest.get(`/transactions/${data}`)

        console.log(newData)

        const countHours = moment(new Date()).diff(moment(newData.data.expires_at), 'hours');
        console.log(countHours)


        setResData({...newData.data, countHours})
        // alert(response)
      } catch (e) {
        console.log({error: e})
      }




    } else{
      try{
        // alert(scanType)
        const response = await HttpRequest.get(`/reservations/${data}`)
        console.log(response)
        setResData(JSON.stringify(response))
        // alert(response)
      } catch (e) {
        console.log({error: e})
      }
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

      <View style={styles.container}>


        {

          scannerDisplay ?

              <View style={styles.cameraContainer}>
                <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={styles.camera}
                />
              </View> :

              <View style={styles.buttonsDiv}>

                  {
                    resData &&
                      <View style={styles.dataView}>
                        <View style={styles.textCol}>
                          <Text style={styles.buttonText}>Start Date:</Text>
                          <Text style={styles.buttonText}>{resData.created_at}</Text>
                        </View>
                        <View style={styles.textCol}>
                          <Text style={styles.buttonText}>End Date:</Text>
                          <Text style={styles.buttonText}>{resData.expires_at}</Text>
                        </View>
                        <View style={styles.textCol}>
                          <Text style={styles.buttonText}>Leaved Date:</Text>
                          <Text style={styles.buttonText}>{resData.leaved_at}</Text>
                        </View>
                        {
                          resData.countHours>0 &&
                          <View style={styles.textCol}>
                            <Text style={styles.buttonText}>Hours Passed:</Text>
                            <Text style={styles.buttonText}>{resData.countHours}</Text>
                          </View>
                        }
                      </View>

                  }
                  {/*<Text>{resData}</Text>*/}

                <View style={styles.buttons}>
                  <Pressable style={styles.button} onPress={() => {setScannerDisplay(prev => !prev);setScanType(0)}}><Text style={styles.buttonText}>Transactions</Text></Pressable>
                  {/*<Button style={styles.button} title={"Reserv"} onPress={() => {setScannerDisplay(prev => !prev);setScanType(1)}}  />*/}
                </View>

              </View>
        }


      </View>

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
  textCol: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    height: "40px",
    marginHorizontal: "20px",
  },
  buttonsDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent:"center",
    width: "100%",
    height: "100%",
  },
  buttons: {
    display: "flex",
    flexDirection: "column",
    width: "90%",
    gap: 10,
    justifyContent:"space-around",
    margin:10
  },
  dataView: {
    width: "90%",
    height: 300,
    display: "flex",
    flexDirection: "column",

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
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 44,
    borderRadius: 4,
    elevation: 3,
    backgroundColor: '#F6DF08',
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    color: '#000',
  }
});
