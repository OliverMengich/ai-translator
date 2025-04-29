import { StyleSheet,Pressable, Text, View, Platform } from 'react-native'
import React from 'react'
import LineDisplay from './LinearDisplay'
interface Props{
    isDarkMode:boolean
    activeTab:string
    tabElements: {
        id: string
        name:string
        onPress:()=>void
    }[]
    
}
const DEFAULT_COLORS = {
    BLUE: '#05C40C'
}
export default function TabsElements({isDarkMode,activeTab,tabElements}:Props) {
    return (
        <LineDisplay
            data={tabElements}
            isDarkMode={isDarkMode}
            isLoading={false}
            loadingItem='advert'
            keyExtractor={it=>it.id}
            renderItem={({it})=>(
                <View style={[styles.inactiveTab,{borderRadius:15,backgroundColor:activeTab===it.id?DEFAULT_COLORS.BLUE:isDarkMode?'rgb(17 24 39)':'#fff' ,overflow: Platform.OS==='android'?'hidden':'visible',marginHorizontal:10,marginVertical:4},{borderColor:isDarkMode?'#ccc':'#000'}]}>
                    <Pressable key={it.id}  android_ripple={{color: '#ccc'}} onPress={it.onPress} >
                        <Text style={[styles.textStyle,{color:activeTab===it.id?'#fff':'#000'},]}>
                            {it.name}
                        </Text>
                    </Pressable>
                </View>
            )}
        />
  )
}

const styles = StyleSheet.create({
    inactiveTab: {
        borderWidth:0,
    },
    activeTab:{
        backgroundColor: DEFAULT_COLORS.BLUE
    },
    textStyle:{
        textAlign:'center',
        fontWeight:'bold',
        paddingVertical: 6,
        paddingHorizontal: 25,
    },
})