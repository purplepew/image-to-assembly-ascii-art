"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show popup after a short delay on initial load
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogTitle className="sr-only">Welcome Image</DialogTitle>
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-white/80 hover:bg-white"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="p-6 text-center">
            <img src="https://i.imgflip.com/9xjeoy.jpg" alt="Popup image" className="w-full h-auto rounded-lg mb-4" />
            <p className="text-gray-700"></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
