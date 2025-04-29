import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native'
import React from 'react'
const {height,width} = Dimensions.get('screen');
export default function OverLayLoader({}:{isDarkMode:boolean}) {
    return (
        <View style={styles.overLayBackground}>
            <ActivityIndicator size={'large'} color={'#000'} />
            <Text style={{color:'#fff',fontSize:20}}>Loading...</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    overLayBackground:{
        zIndex:30,
        justifyContent:'center',
        alignItems:'center',
        position:'absolute',
        top:0,
        left:0,
        height,
        width,
        backgroundColor:'rgba(0,0,0,.5)',
    }
})