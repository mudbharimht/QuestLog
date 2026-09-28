import { useState, useEffect } from "react"
import { themes } from "./themes"

export function useTheme(){
    const [theme, setTheme] = useState(()=>{
        const nowTheme = localStorage.getItem("theme")
        if (themes[nowTheme]){
            return nowTheme
            } 
        return "Crimson Terminal"
    })
    
    useEffect(()=>{
        for(const [slot,color] of Object.entries(themes[theme])){

            document.documentElement.style.setProperty("--"+slot, color)
        }
        
        localStorage.setItem("theme", theme);

    },[theme])

    return [theme, setTheme] 
}
