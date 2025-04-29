import { FlatList, StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
interface Props<T>{
    data: T[]
    isLoading:boolean
    loadingItem: "matatu" | "advert" | "package" | "route" | "user"
    isDarkMode?:boolean
    keyExtractor:(item:T)=>string
    renderItem:({it}:{it:T})=>JSX.Element;
}
import Animated, { useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated'
const duration = 800;
function MatatuLoader({isDarkMode}: {isDarkMode?:boolean}){
    const opacity= useSharedValue(0);
    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration}),
                withTiming(0, { duration })
            ),-1,true
        );
    }, []);
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));
    return(
        <View style={[styles.item,]}>
            <Animated.View style={[styles.bigbox,animatedStyle,{backgroundColor:isDarkMode?'#f5f5f5':'#B3B3B3'}]}/>
            <View style={{paddingHorizontal:7}}>
                <Animated.View style={[styles.smallbox,animatedStyle,{backgroundColor:isDarkMode?'#f5f5f5':'##B3B3B3'}]}/>
                <Animated.View style={[styles.smallbox2,,animatedStyle,{backgroundColor:isDarkMode?'#f5f5f5':'#B3B3B3'}]}/>
            </View>
        </View>
    )
}
export default function LineDisplay<T>({data,isLoading,isDarkMode,loadingItem,renderItem,keyExtractor}:Props<T>) {
    return (
        <View>
            {
                isLoading ? (
                    <FlatList
                        data={[1,2,3,4]}
                        horizontal
                        renderItem={({item})=>(
                            <MatatuLoader
                                isDarkMode={isDarkMode}
                            />
                        )}
                        keyExtractor={(item)=>item.toString()}
                    />
                ) : data && data.length===0?(
                    <View style={{height: 150, alignItems:'center',justifyContent:'center'}}>
                        <Text style={{color: isDarkMode?'#fff':'#000'}}>No {loadingItem}</Text>
                    </View>
                ): (
                    <FlatList
                        data={data}
                        horizontal
                        renderItem={({ item }) => renderItem({it:item})}
                        keyExtractor={keyExtractor}
                    />
                )
            }
        </View>
    )
}


const styles = StyleSheet.create({
    item:{
        width:180,
        height:200,
        borderRadius:10,
        borderWidth:.5,
        borderColor:'#ccc',
        margin:5
    },
    lineItem:{
        // height:30,
        margin:5,
        padding:5,
        width:100,
        borderRadius:10,
        borderWidth:.5,
        borderColor:'#ccc',
    },
    bigbox:{
        width:'100%',
        height:'60%',
        borderTopLeftRadius:10
        ,borderTopRightRadius:10,
    },
    smallbox:{
        width:'80%',
        marginVertical:8, 
        height:13,
        borderRadius:15,
    },
    smallbox2:{
        width:'50%',
        marginVertical:8,
        height:10,
        borderRadius:5,
    }
})