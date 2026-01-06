import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SessionUserData } from "../types";

export const userSlice = createSlice({
    name: "user",
    initialState: {
        value: {
            email: "", 
            name: "",
            lastName: "",
            registered: false,
            rememberme: false,
            isAdmin: false,
            streamChatToken: "",
            userId: "",
            city: "",
            dolar: true,
            token: "",
        } as SessionUserData
    },
    reducers: {
        setUser: (state, {payload: sessionUserData}: PayloadAction<SessionUserData>) => {
            state.value = sessionUserData;
        },
        setDolar: (state, {payload}: PayloadAction<boolean>) => {
            state.value.dolar = payload;
        },
        clearUser: (state) => {
            state.value = {
                email: "",
                name: "",
                lastName: "",
                registered: false,
                rememberme: false,
                isAdmin: false,
                streamChatToken: "",
                userId: "",
                city: "",
                dolar: true,
                token: "",
            };
        }
    },
});

export const { setUser, clearUser, setDolar } = userSlice.actions;
export default userSlice.reducer; 