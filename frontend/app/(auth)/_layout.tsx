import { Slot } from "expo-router";
import KeyboardDismissView from "@/components/KeyBoardDismissView";

//app/(auth)/_layout.tsx
export default function authLayout(){
    return (
        <KeyboardDismissView>
            <Slot/>
        </KeyboardDismissView>
    );
}