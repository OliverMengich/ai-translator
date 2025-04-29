import { Dimensions, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native'
import React, { useEffect, useRef, useState, useTransition } from 'react'
import TabsElements from '@/components/tabs-elements'
const {width} = Dimensions.get("screen")
import {AntDesign, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons'
import OverLayLoader from '@/components/overlay-loader'
import {Audio} from 'expo-av'
import * as FileSystem from 'expo-file-system'
import Slider  from '@react-native-community/slider';
import Animated,{ useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
interface MessageType{
    message: string,
    audio?: {
        sound: Audio.Sound,   
        uri: string, 
        duration: number 
    } | undefined,
    translation: string
}
import * as Speech from 'expo-speech';
const dt = {
    'es':'Spanish',
    'it':'Italian',
    'fr':'French'
}
type LanguageType = keyof typeof dt
import { createPartFromUri, createUserContent, GoogleGenAI } from "@google/genai";
import { useStore } from '@/state'

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_APIKEY});
const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};
export default function translator() {
    const chats = useStore((st)=>st.messages)
    const addMessage = useStore((st)=>st.addMessage)
    const deleteMessage = useStore((st)=>st.deleteMessage)

    const [viewType, setViewType] = React.useState<LanguageType>('es');
    const [isPending,startTransition] = useTransition();
    const [isLoading,setIsLoading] = useState(false)
    const [message,setMessage]= useState('')
    const onRecordPressed=()=>{}
    const onSendMessage = async ()=>{
        //translate english language to either Spanish, italian or french and return translated language, then append it to the list
        //1. Send to OpenAI API to translate it to selected language.
        try {
            const translateLanguage=dt[viewType]
            setIsLoading(true)
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `Translate ${message} to ${translateLanguage} and only return the best translation.`,
            });
            setIsLoading(false)
            if(response.text){
                addMessage({
                    id: Math.floor(Math.random()*100000).toString(),
                    message,
                    translation: response.text,
                    time: new Date().toLocaleString()
                })
            }else{
                ToastAndroid.show("Could not translate",ToastAndroid.LONG)
            }
            setMessage('')
            // Return the translated text 
        } catch (error) {
            setIsLoading(false)
            ToastAndroid.show("Could not translate"+(error as string).toString(),ToastAndroid.LONG)
        }
    }
    function toggleView(type: 'es'|'it'|'fr'){
        switch(type){
            case 'es':
                startTransition(()=>{
                    setViewType('es');
                });
                break;
            case 'fr':
                startTransition(()=>{
                    setViewType('fr');
                });
                break;
            case 'it':
                startTransition(()=>{
                    setViewType('it')
                });
                break;
            default:
                startTransition(()=>{
                    setViewType('es');
                });
        }
    }
    const [recording, setRecording] = useState<Audio.Recording>();
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                await requestPermission();
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            ToastAndroid.show("Recording started",ToastAndroid.SHORT)
        } catch (err) {
            ToastAndroid.show("Failed to start recording",ToastAndroid.SHORT)
        }
    }

    async function playAudio(uri: string){
        const {sound, status} = await Audio.Sound.createAsync({ uri: uri as string })
        
        if(status.isLoaded){
            sound.playAsync()
        }
    }

    async function deleteMessageFc() {
        const messages = chats.filter(msg=>selectedMessages.includes(msg.id))
        if (messages.length>0) {
            await Promise.all(messages.map(async (m)=>{
                if (m.audio) {
                    try {
                        await FileSystem.deleteAsync((m.audio.uri as string).trim(),{idempotent: true})
                        ToastAndroid.show("File deleted",ToastAndroid.LONG)
                    } catch (error) {
                        ToastAndroid.show("Could not delete file deleted",ToastAndroid.LONG)
                    }
                }
                deleteMessage(m.id)
            }))
        }
        setSelectedMessages([])
    }
    async function stopRecording() {
        if (recording) {
            setRecording(undefined);
            await recording?.stopAndUnloadAsync();
            await Audio.setAudioModeAsync( {allowsRecordingIOS: false});
            const uri = recording?.getURI();
            const { status} = await Audio.Sound.createAsync({ uri: uri as string })
            let duration = 0
            if (status.isLoaded) {
                duration = status.durationMillis??0
            }
            try {
                setIsLoading(true)
                const fileBlob = await fetch(uri as string).then(res=>res.blob())
                const myfile = await ai.files.upload({
                    file: fileBlob,
                    config:{mimeType:'audio/m4a'}
                })
                const response = await ai.models.generateContent({
                    model:'gemini-2.0-flash',
                    contents: createUserContent([
                        createPartFromUri(myfile.uri as string, myfile.mimeType as string),
                        `Translate this audio to English and only return the best translation.`
                    ])
                })
                setIsLoading(false)
                if(response.text){
                    addMessage({
                        id: Math.floor(Math.random()*100000).toString(),
                        audio: {
                            uri: uri as string,
                            duration,
                        },
                        message,
                        translation: response.text,
                        time: new Date().toLocaleString()
                    })
                }else{
                    ToastAndroid.show("No translation, try again.",ToastAndroid.LONG)
                }
            } catch (error) {
                setIsLoading(false)
                console.log(error)
                ToastAndroid.show("Could not translate"+(error as string).toString(),ToastAndroid.LONG)
            }
            
        }
    }

    const opacity = useSharedValue(0);

    const onLongPressMessage = (id: string)=>{
        if (selectedMessages.includes(id)) {
            // If already selected, remove it
            setSelectedMessages(selectedMessages.filter(id => id !== id));
          } else {
            // If not selected, add it
            setSelectedMessages([...selectedMessages, id]);
          }
    }
    useEffect(()=>{
        if(recording){
            opacity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 800}),
                    withTiming(0, { duration: 800 })
                ),-1,true
            );
        }
    },[recording])
    const flatListRef = useRef<FlatList>(null)
    useEffect(()=>{
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({animated: true})
        }
    },[chats])
    const animatedStyle = useAnimatedStyle(()=>({
        flexDirection:'row',
        alignItems:'center',
        opacity: opacity.value
    }))
    const Speak = (text: string)=>{  
        //translates
        Speech.speak(text,{
            language: viewType
        })
    }
    const [selectedMessages,setSelectedMessages] = useState<string[]>([])
    return (
        <>
            {
                isPending || isLoading?(
                    <OverLayLoader isDarkMode={false} />
                ):null
            }
            {selectedMessages.length>0?(<View style={{backgroundColor:'#929292',position:'absolute',top:0,width:'100%',zIndex:20,flexDirection:'row',paddingVertical:10,paddingHorizontal:20, justifyContent:'space-between', alignItems:'center'}}>
                <View style={{flexDirection:'row',alignItems:'center'}}>
                    <Ionicons size={25} onPress={()=>{setSelectedMessages([])}} color='#000' name={'arrow-back'} />
                    <Text style={{fontSize:25,marginHorizontal:30,}}>{selectedMessages.length}</Text>
                </View>
                <AntDesign onPress={deleteMessageFc} name='delete' size={30}  color='#000' /> 
            </View>):null}
            <View style={{flexDirection:'column',justifyContent:'space-between',height:'100%'}}>
                <View style={{flex:1}}>
                    <TabsElements
                        activeTab={viewType}
                        isDarkMode={false}
                        tabElements={[
                            {id:'es',name:'Spanish',onPress:()=>{toggleView('es')}},
                            {id:'it',name:'Italian',onPress:()=>{toggleView('it')}},
                            {id:'fr',name:'French',onPress:()=>{toggleView('fr')}}
                        ]}
                    />
                        {
                            chats.length ===0?(
                                <View style={{flexDirection:'column',flex:1,alignItems:'center',justifyContent:'center'}}>
                                    <Text style={{fontWeight:'900',fontSize:50}}>Start Chat</Text>
                                    <Text>
                                        Translate any language to english
                                    </Text>
                                </View>
                            ):(
                                <FlatList
                                    data={chats}
                                    ref={flatListRef}
                                    extraData={selectedMessages}
                                    
                                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                    renderItem={({item})=>(
                                        <Pressable style={{backgroundColor:selectedMessages.includes(item.id)?'#BABABA':'transparent'}} onLongPress={()=>{onLongPressMessage(item.id) }}>
                                            {
                                                item.audio ?(
                                                    <View style={{backgroundColor:'#ccc',maxWidth:width*.5,width:width*.5,marginVertical:10,marginLeft:10,borderTopRightRadius:10,borderBottomRightRadius:10,borderBottomLeftRadius:10,}}>
                                                        <View style={{flexDirection:'row',padding:5,alignItems:'center'}}>
                                                            <MaterialCommunityIcons size={25} onPress={()=>{playAudio(item.audio.uri as string)}} color='#05C40C' name={'play'} />
                                                            <View style={{width:'90%'}}>
                                                                <Slider
                                                                    maximumValue={item.audio.duration}
                                                                    minimumValue={0}
                                                                    minimumTrackTintColor="#05C40C"
                                                                    maximumTrackTintColor="#05C40C"
                                                                    thumbTintColor="#05C40C"
                                                                    
                                                                />
                                                                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                                                                    <Text></Text>
                                                                    <Text>{formatTime(item.audio.duration)}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        <View style={{borderTopColor:'#000',borderTopWidth:.5,padding: 5}}>
                                                            <Text>
                                                                {
                                                                    item.translation
                                                                }
                                                            </Text>
                                                        <Text style={{color:'#000',alignSelf:'flex-end'}}>{item.time}</Text>
                                                        </View>
                                                    </View>
                                                ):(
                                                    <View style={{alignSelf:'flex-end',backgroundColor:'#ccc',marginVertical:10,marginRight:10,borderTopLeftRadius:10,borderBottomRightRadius:10,borderBottomLeftRadius:10,paddingVertical:10,maxWidth:width*.5,width:width*.5}}>
                                                        <Text style={{padding:10}}>{item.message}</Text>
                                                        <View style={{borderTopColor:'#000',borderTopWidth:.5}}>
                                                            <Text style={{padding:10}}>
                                                                {
                                                                    item.translation
                                                                }
                                                            </Text>
                                                            <Pressable android_ripple={{color: '#f5f5f5'}} onPress={()=>{Speak(item.translation)}} >
                                                                <Text style={[styles.textStyle,{color:'#000'},]}>
                                                                    Speak
                                                                </Text>
                                                            </Pressable>
                                                        </View>
                                                        <Text style={{margin:5,color:'#000',alignSelf:'flex-end'}}>{item.time}</Text>
                                                    </View>
                                                )
                                            }
                                        </Pressable>
                                    )}
                                />
                            )
                        }
                    <View style={{width}}>
                    </View>
                </View>
                <View style={{flexDirection:'row',marginVertical:10, marginHorizontal: 10,left:0, alignItems:'center'}}>
                    {
                        recording?(
                            <View style={[styles.recordingBox,{}]}>
                                <Animated.View style={animatedStyle}>
                                    <MaterialCommunityIcons onPressOut={()=>{}} name='microphone' color={'#05C40C'} size={20} onPress={onRecordPressed} />
                                    <Text>Recording ...</Text>
                                </Animated.View>
                            </View>
                        ):(
                            <TextInput
                                multiline
                                placeholder='Type a message...'
                                placeholderTextColor={'#000'}
                                value={message}
                                onChangeText={setMessage}
                                style={[styles.textInputStyle,{borderColor: '#000'}]}
                            />
                        )
                    }
                    <View style={{width:40,height:40,alignItems:'center',justifyContent:'center',marginLeft:6,borderRadius:20, backgroundColor:'#05C40C'}}>
                        {
                            message?(
                                <MaterialCommunityIcons name='send' color={'#fff'} size={20} onPress={onSendMessage} />
                            ):(
                                <MaterialCommunityIcons onLongPress={startRecording} onPressOut={stopRecording} name='microphone' color={'#fff'} size={20} />
                            )
                        }
                    </View>
                </View>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    inactiveTab: {
        borderWidth:0,
    },
    activeTab:{
        backgroundColor: '#499dff'
    },
    textStyle:{
        textAlign:'center',
        fontWeight:'bold',
        paddingVertical: 6,
        paddingHorizontal: 25,
    },
    textInputStyle:{
		fontSize:20,
        backgroundColor:'#fff',
        paddingHorizontal:20,
        paddingVertical:12,
        alignSelf:'center',
        height:'90%',
		width: width * .85,
        borderRadius: 25,
		// marginTop:4,
	},
    recordingBox:{
        flexDirection: 'row',
		fontSize:20,
        backgroundColor:'#fff',
        paddingHorizontal:20,
        paddingVertical:12,
        alignSelf:'center',
		width: width * .85,
        borderRadius: 25,
		// marginTop:4,
	},
})