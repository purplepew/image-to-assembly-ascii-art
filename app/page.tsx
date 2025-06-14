"use client"

import type React from "react"

import type { ReactElement } from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Copy, ImageIcon, Table, FileText, Terminal, Underline } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const ASCII_CHARS = {
  simple: " .:-=+*#%@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  dots: " ·•●",
}

// Block characters for spreadsheet
const BLOCK_CHARS = ["", "░", "▒", "▓", "█"]

// ASCII values for common block characters in DOS
const BLOCK_CHAR_ASCII = {
  "░": 176, // Light shade
  "▒": 177, // Medium shade
  "▓": 178, // Dark shade
  "█": 219, // Full block
  " ": 32, // Space
}

// DOS display has white text on black background, so we need to map shades differently
const DOS_SHADE_MAPPING = {
  "█": 32, // Full block (darkest) -> Space (appears black in DOS)
  "▓": 176, // Dark shade -> Light shade (appears darker in DOS)
  "▒": 177, // Medium shade -> Medium shade (appears as is in DOS)
  "░": 178, // Light shade -> Dark shade (appears lighter in DOS)
  " ": 219, // Space (lightest) -> Full block (appears white in DOS)
}

export default function PixelToTextConverter(): ReactElement {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [asciiArt, setAsciiArt] = useState<string>("")
  const [spreadsheetData, setSpreadsheetData] = useState<string>("")
  const [csvContent, setCsvContent] = useState<string>("")
  const [assemblyCode, setAssemblyCode] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [width, setWidth] = useState([80])
  const [charSet, setCharSet] = useState<keyof typeof ASCII_CHARS>("simple")
  const [invertColors, setInvertColors] = useState(true)
  const [invertSpreadsheet, setInvertSpreadsheet] = useState(true)
  const [conversionType, setConversionType] = useState<"ascii" | "spreadsheet" | "assembly">("ascii")
  const [spreadsheetFormat, setSpreadsheetFormat] = useState<"blocks" | "hex" | "rgb">("blocks")
  const [blockLevels, setBlockLevels] = useState([5])
  const [invertAssembly, setInvertAssembly] = useState(true)
  const [dosDisplayMode, setDosDisplayMode] = useState<"auto" | "custom">("auto")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setAsciiArt("")
        setSpreadsheetData("")
        setAssemblyCode("")
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleCsvUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (
        file &&
        (file.type === "text/csv" ||
          file.name.endsWith(".csv") ||
          file.type.includes("excel") ||
          file.name.endsWith(".xlsx"))
      ) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setCsvContent(content)
          toast({
            title: "CSV Uploaded",
            description: "Your CSV file has been uploaded successfully",
          })
        }
        reader.readAsText(file)
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const convertToSpreadsheet = useCallback(() => {
    if (!selectedImage || !canvasRef.current) return

    setIsProcessing(true)

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Calculate dimensions - for spreadsheets we can use smaller dimensions
      const targetWidth = Math.min(width[0], 100) // Limit width for spreadsheets
      const aspectRatio = img.height / img.width
      const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5)

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Draw and scale image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      // Get image data
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
      const pixels = imageData.data

      // Generate CSV content
      let csv = ""

      // Add header row for RGB format
      if (spreadsheetFormat === "rgb") {
        csv = "R,G,B\n"
      }

      // Process each pixel
      for (let y = 0; y < targetHeight; y++) {
        const row = []
        for (let x = 0; x < targetWidth; x++) {
          const offset = (y * targetWidth + x) * 4
          const r = pixels[offset]
          const g = pixels[offset + 1]
          const b = pixels[offset + 2]

          if (spreadsheetFormat === "blocks") {
            // Calculate brightness (0-255)
            const brightness = Math.round((r + g + b) / 3)

            // Map brightness to block character index
            // We use blockLevels[0] to determine how many levels to use
            const levels = blockLevels[0]
            let blockIndex = Math.floor((brightness / 255) * (levels - 1))

            // Invert if needed
            if (invertSpreadsheet) {
              blockIndex = levels - 1 - blockIndex
            }

            // Get the appropriate block character
            let char = ""
            if (levels === 5) {
              // Use all block characters
              char = BLOCK_CHARS[blockIndex]
            } else if (levels === 3) {
              // Use only light, medium, and full blocks
              const chars = ["", "░", "█"]
              char = chars[blockIndex]
            } else if (levels === 2) {
              // Use only empty and full blocks
              const chars = ["", "█"]
              char = chars[blockIndex]
            }

            row.push(char)
          } else if (spreadsheetFormat === "hex") {
            // Hex color format
            const hexColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
            row.push(hexColor)
          } else {
            // RGB format
            row.push(`${r},${g},${b}`)
          }
        }

        if (spreadsheetFormat === "rgb") {
          // For RGB format, each pixel is a row
          csv += row.join("\n") + "\n"
        } else {
          // For blocks and hex formats, each row is a row
          csv += row.join(",") + "\n"
        }
      }

      setSpreadsheetData(csv)
      setCsvContent(csv) // Also set this for assembly conversion
      setIsProcessing(false)
    }

    img.src = selectedImage
  }, [selectedImage, width, spreadsheetFormat, blockLevels, invertSpreadsheet])

  const downloadAsCSV = useCallback(() => {
    const blob = new Blob([spreadsheetData], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pixel-art-${spreadsheetFormat}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Downloaded!",
      description: `CSV file with ${spreadsheetFormat === "blocks" ? "ASCII blocks" : spreadsheetFormat.toUpperCase() + " values"} downloaded successfully`,
    })
  }, [spreadsheetData, spreadsheetFormat, toast])

  const convertToAscii = useCallback(() => {
    if (!selectedImage || !canvasRef.current) return

    setIsProcessing(true)

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const targetWidth = width[0]
      const aspectRatio = img.height / img.width
      const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5) // 0.5 to account for character height/width ratio

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Draw and scale image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      // Get image data
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
      const pixels = imageData.data

      const chars = ASCII_CHARS[charSet]
      let ascii = ""

      // Convert pixels to ASCII
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const offset = (y * targetWidth + x) * 4
          const r = pixels[offset]
          const g = pixels[offset + 1]
          const b = pixels[offset + 2]

          // Calculate brightness (0-255)
          const brightness = Math.round((r + g + b) / 3)

          // Convert brightness to character index
          let charIndex = Math.floor((brightness / 255) * (chars.length - 1))

          // Invert if needed
          if (invertColors) {
            charIndex = chars.length - 1 - charIndex
          }

          ascii += chars[charIndex]
        }
        ascii += "\n"
      }

      setAsciiArt(ascii)
      setIsProcessing(false)
    }

    img.src = selectedImage
  }, [selectedImage, width, charSet, invertColors])

  const convertToAssembly = useCallback(() => {
    if (!csvContent) {
      toast({
        title: "No CSV Data",
        description: "Please upload a CSV file or generate spreadsheet data first",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    // Parse CSV content
    const rows = csvContent.split("\n").filter((row) => row.trim() !== "")

    // Generate assembly code using character output function (INT 21h, AH=02h)
    let asm = `;----------------------------------------\n`
    asm += `; ASCII Art in x86 Assembly for DOSBox\n`
    asm += `; Generated by Pixel Art to Text Converter\n`
    asm += `;----------------------------------------\n\n`

    asm += `.MODEL SMALL\n`
    asm += `.STACK 100h\n\n`

    asm += `.DATA\n`
    asm += `    crlf DB 13, 10, "$"  ; Carriage return + line feed\n\n`

    asm += `.CODE\n`
    asm += `MAIN PROC\n`
    asm += `    MOV AX, @DATA\n`
    asm += `    MOV DS, AX\n\n`

    asm += `    CALL DISPLAY_ART\n\n`

    asm += `    MOV AX, 4C00h\n`
    asm += `    INT 21h\n`
    asm += `MAIN ENDP\n\n`

    asm += `DISPLAY_ART PROC\n`

    // Process each row of the CSV
    rows.forEach((row, rowIndex) => {
      // Split the row into cells (characters)
      const cells = row.split(",")

      // Output each character in the row
      cells.forEach((cell, cellIndex) => {
        // Skip empty cells
        if (cell.trim() === "") {
          if (dosDisplayMode === "auto") {
            // In auto mode, empty cells become full blocks (white in DOS)
            asm += `    MOV DL, 219\n`
          } else {
            // In custom mode, empty cells become spaces (black in DOS)
            asm += `    MOV DL, 32\n`
          }
          asm += `    MOV AH, 02h\n`
          asm += `    INT 21h\n`
          return
        }

        // Get the character (might be a block character or other)
        const char = cell.trim()

        // Handle block characters specifically with DOS display mode in mind
        let asciiValue = 0

        if (dosDisplayMode === "auto") {
          // Auto mode: Map characters based on how they appear in DOS
          // (white text on black background)
          if (DOS_SHADE_MAPPING[char] !== undefined) {
            asciiValue = DOS_SHADE_MAPPING[char]
          } else {
            // For other characters, use their first character's ASCII value
            asciiValue = char.charCodeAt(0)
            // Ensure the value is within valid range (0-255)
            if (asciiValue > 255) {
              asciiValue = 32 // Default to space for out-of-range characters
            }
          }
        } else {
          // Custom mode: Use standard ASCII values with inversion option
          if (char === "░") {
            asciiValue = invertAssembly ? 178 : 176 // Light shade (176) or Dark shade (178)
          } else if (char === "▒") {
            asciiValue = 177 // Medium shade stays the same
          } else if (char === "▓") {
            asciiValue = invertAssembly ? 176 : 178 // Dark shade (178) or Light shade (176)
          } else if (char === "█") {
            asciiValue = 219 // Full block
          } else if (BLOCK_CHAR_ASCII[char]) {
            // For other known block characters
            asciiValue = BLOCK_CHAR_ASCII[char]
          } else {
            // For other characters, use their first character's ASCII value
            asciiValue = char.charCodeAt(0)
            // Ensure the value is within valid range (0-255)
            if (asciiValue > 255) {
              asciiValue = 32 // Default to space for out-of-range characters
            }
          }
        }

        asm += `    MOV DL, ${asciiValue}\n`
        asm += `    MOV AH, 02h\n`
        asm += `    INT 21h\n`
      })

      // Add a newline after each row
      asm += `    MOV DX, OFFSET crlf\n`
      asm += `    MOV AH, 09h\n`
      asm += `    INT 21h\n`
    })

    asm += `    RET\n`
    asm += `DISPLAY_ART ENDP\n\n`
    asm += `END MAIN\n`

    setAssemblyCode(asm)
    setIsProcessing(false)
  }, [csvContent, toast, invertAssembly, dosDisplayMode])

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: "Copied!",
          description: "Content copied to clipboard",
        })
      })
    },
    [toast],
  )

  const downloadAsText = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleConvert = useCallback(() => {
    if (conversionType === "ascii") {
      convertToAscii()
    } else if (conversionType === "spreadsheet") {
      convertToSpreadsheet()
    } else if (conversionType === "assembly") {
      convertToAssembly()
    }
  }, [conversionType, convertToAscii, convertToSpreadsheet, convertToAssembly])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Pixel Art to Text Converter
          </h1>
          <p className="text-gray-600">Transform your pixel art into beautiful ASCII text art</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload and Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Upload & Settings
              </CardTitle>
              <CardDescription>Upload your pixel art and customize the conversion settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              {conversionType !== "assembly" ? (
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Choose Image</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="csv-upload">Upload CSV/Excel File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleCsvUpload}
                      ref={csvInputRef}
                      className="hidden"
                    />
                    <Button onClick={() => csvInputRef.current?.click()} variant="outline" className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CSV/Excel
                    </Button>
                  </div>
                  {csvContent && (
                    <div className="text-sm text-green-600">
                      CSV file uploaded successfully! ({csvContent.split("\n").length} rows)
                    </div>
                  )}
                </div>
              )}

              {/* Image Preview */}
              {selectedImage && conversionType !== "assembly" && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-lg p-4 bg-white">
                    <img
                      src={selectedImage || "/placeholder.svg"}
                      alt="Selected pixel art"
                      className="max-w-full h-auto mx-auto pixelated"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                </div>
              )}

              {/* Conversion Type */}
              <div className="space-y-2">
                <Label>Conversion Type</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={conversionType === "ascii" ? "default" : "outline"}
                    onClick={() => setConversionType("ascii")}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    ASCII Art
                  </Button>
                  <Button
                    variant={conversionType === "spreadsheet" ? "default" : "outline"}
                    onClick={() => setConversionType("spreadsheet")}
                    className="flex-1"
                  >
                    <Table className="w-4 h-4 mr-2" />
                    Spreadsheet
                  </Button>
                  <Button
                    variant={conversionType === "assembly" ? "default" : "outline"}
                    onClick={() => setConversionType("assembly")}
                    className="flex-1"
                  >
                    <Terminal className="w-4 h-4 mr-2" />
                    Assembly
                  </Button>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                {conversionType !== "assembly" && (
                  <div className="space-y-2">
                    <Label>Width (characters): {width[0]}</Label>
                    <Slider value={width} onValueChange={setWidth} max={120} min={20} step={5} className="w-full" />
                  </div>
                )}

                {conversionType === "ascii" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Character Set</Label>
                      <Select value={charSet} onValueChange={(value: keyof typeof ASCII_CHARS) => setCharSet(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple ({ASCII_CHARS.simple})</SelectItem>
                          <SelectItem value="detailed">Detailed (High contrast)</SelectItem>
                          <SelectItem value="blocks">Blocks ({ASCII_CHARS.blocks})</SelectItem>
                          <SelectItem value="dots">Dots ({ASCII_CHARS.dots})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="invert"
                        checked={invertColors}
                        onChange={(e) => setInvertColors(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="invert">Invert colors</Label>
                    </div>
                  </>
                ) : conversionType === "spreadsheet" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Spreadsheet Format</Label>
                      <Select
                        value={spreadsheetFormat}
                        onValueChange={(value: "blocks" | "hex" | "rgb") => setSpreadsheetFormat(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blocks">ASCII Blocks (░▒▓█)</SelectItem>
                          <SelectItem value="hex">HEX Colors (#RRGGBB)</SelectItem>
                          <SelectItem value="rgb">RGB Values (R,G,B)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {spreadsheetFormat === "blocks" && (
                      <>
                        <div className="space-y-2">
                          <Label>Block Detail Level: {blockLevels[0]}</Label>
                          <Slider
                            value={blockLevels}
                            onValueChange={setBlockLevels}
                            max={5}
                            min={2}
                            step={1}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">2:</span> Empty and Full (█) <br />
                            <span className="font-medium">3:</span> Empty, Light (░), and Full (█) <br />
                            <span className="font-medium">4:</span> Empty, Light (░), Medium (▒), Full (█) <br />
                            <span className="font-medium">5:</span> All blocks (░▒▓█)
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="invertSpreadsheet"
                            checked={invertSpreadsheet}
                            onChange={(e) => setInvertSpreadsheet(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="invertSpreadsheet">Invert shades</Label>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // Assembly settings
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      Assembly code generation uses the CSV data directly. Upload a CSV file with ASCII block characters
                      to generate x86 Assembly code for DOSBox.
                    </p>

                    <div className="space-y-2 mt-3">
                      <Label>DOS Display Mode</Label>
                      <Select
                        value={dosDisplayMode}
                        onValueChange={(value: "auto" | "custom") => setDosDisplayMode(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Optimized for DOSBox)</SelectItem>
                          <SelectItem value="custom">Custom (Manual shade mapping)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Auto:</span> Automatically maps shades for DOSBox's white-on-black
                        display
                        <br />
                        <span className="font-medium">Custom:</span> Uses standard ASCII values with manual inversion
                        option
                      </div>
                    </div>

                    {dosDisplayMode === "custom" && (
                      <div className="flex items-center space-x-2 mt-3">
                        <input
                          type="checkbox"
                          id="invertAssembly"
                          checked={invertAssembly}
                          onChange={(e) => setInvertAssembly(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="invertAssembly">Invert shades</Label>
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-800 font-medium">DOSBox Display Information:</p>
                      <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                        <li>DOSBox uses white text on black background</li>
                        <li>Full block (█, ASCII 219) appears as white in DOSBox</li>
                        <li>Space (ASCII 32) appears as black in DOSBox</li>
                        <li>Auto mode reverses the shades to match your original image</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Convert Button */}
              <Button
                onClick={handleConvert}
                disabled={
                  (conversionType !== "assembly" && !selectedImage) ||
                  (conversionType === "assembly" && !csvContent) ||
                  isProcessing
                }
                className="w-full"
                size="lg"
              >
                {isProcessing
                  ? "Converting..."
                  : `Convert to ${conversionType === "ascii"
                    ? "ASCII"
                    : conversionType === "spreadsheet"
                      ? "Spreadsheet"
                      : "Assembly"
                  }`}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle>
                {conversionType === "ascii"
                  ? "ASCII Art Output"
                  : conversionType === "spreadsheet"
                    ? "Spreadsheet Output"
                    : "Assembly Code Output"}
              </CardTitle>
              <CardDescription>
                {conversionType === "ascii"
                  ? "Your converted ASCII art will appear here"
                  : conversionType === "spreadsheet"
                    ? "Your spreadsheet data will be ready to download"
                    : "Your x86 Assembly code for DOSBox will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conversionType === "ascii" ? (
                asciiArt ? (
                  <>
                    <div className="flex gap-2">
                      <Button onClick={() => copyToClipboard(asciiArt)} variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={() => downloadAsText(asciiArt, "ascii-art.txt")} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <Textarea
                      value={asciiArt}
                      readOnly
                      className="font-mono text-xs leading-none resize-none min-h-[400px] bg-white text-black border"
                      style={{ fontFamily: "monospace" }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Upload an image and click convert to see ASCII art here (optimized for white backgrounds)</p>
                    </div>
                  </div>
                )
              ) : conversionType === "spreadsheet" ? (
                spreadsheetData ? (
                  <>
                    <div className="flex gap-2">
                      <Button onClick={downloadAsCSV} variant="default" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>
                    <div className="border rounded-lg p-4 bg-white min-h-[400px] overflow-auto">
                      <div className="text-center mb-4">
                        <h3 className="font-medium">Spreadsheet Preview</h3>
                        <p className="text-sm text-gray-500">
                          {spreadsheetFormat === "blocks"
                            ? "Your pixel art has been converted to ASCII block characters"
                            : spreadsheetFormat === "hex"
                              ? "Your pixel art has been converted to HEX color codes"
                              : "Your pixel art has been converted to RGB values"}
                        </p>
                      </div>

                      {spreadsheetFormat === "blocks" && (
                        <div className="font-mono text-center p-4 border bg-gray-50 overflow-auto">
                          <p className="mb-2 text-sm font-medium">Sample Output:</p>
                          <div className="inline-block">
                            {BLOCK_CHARS.slice(1, blockLevels[0]).map((char, i) => (
                              <span key={i} className="mx-1">
                                {char}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-10 gap-0.5 mx-auto max-w-md mt-4">
                        {selectedImage && (
                          <img
                            src={selectedImage || "/placeholder.svg"}
                            alt="Spreadsheet preview"
                            className="col-span-10 w-full h-auto pixelated border"
                            style={{ imageRendering: "pixelated" }}
                          />
                        )}
                      </div>
                      <div className="mt-4 text-sm text-gray-600">
                        <p className="font-medium">Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1 mt-2">
                          <li>Download the CSV file</li>
                          <li>Open in Excel, Google Sheets, or similar application</li>
                          {spreadsheetFormat === "blocks" ? (
                            <>
                              <li>Each cell contains an ASCII block character representing pixel brightness</li>
                              <li>Set all cells to a monospace font (like Courier New)</li>
                              <li>Make cells square by setting equal width and height</li>
                              <li>For best results, remove cell borders and gridlines</li>
                            </>
                          ) : spreadsheetFormat === "hex" ? (
                            <>
                              <li>Each cell contains the HEX color code of the corresponding pixel</li>
                              <li>Use conditional formatting to color cells based on their content</li>
                            </>
                          ) : (
                            <>
                              <li>Each row contains the RGB values of a pixel</li>
                              <li>Use these values to recreate the image or for data analysis</li>
                            </>
                          )}
                        </ol>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center text-gray-500">
                      <Table className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Upload an image and click convert to generate spreadsheet data</p>
                    </div>
                  </div>
                )
              ) : // Assembly output
                assemblyCode ? (
                  <>
                    <div className="flex gap-2">
                      <Button onClick={() => copyToClipboard(assemblyCode)} variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={() => downloadAsText(assemblyCode, "ascii-art.asm")} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download ASM
                      </Button>
                    </div>
                    <Textarea
                      value={assemblyCode}
                      readOnly
                      className="font-mono text-xs leading-none resize-none min-h-[400px] bg-gray-900 text-green-400 border"
                      style={{ fontFamily: "monospace" }}
                    />
                    <div className="mt-4 text-sm text-gray-600 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-medium mb-2">How to use this Assembly code:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Download the ASM file</li>
                        <li>Assemble it using MASM, TASM, or another x86 assembler</li>
                        <li>Run the resulting executable in DOSBox</li>
                        <li>The ASCII art will be displayed on the screen</li>
                      </ol>
                      <p className="mt-2 text-xs">
                        <strong>Note:</strong> This code uses INT 21h function 02h for character-by-character output and
                        is designed for 16-bit DOS environments.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center text-gray-500">
                      <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Upload a CSV file and click convert to generate x86 Assembly code</p>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Upload your pixel art image using the upload button.
                <a
                  style={{  textDecoration: 'underline' }}
                  href="https://pixelartvillage.com/"
                  target='_blank'
                >
                  img to pixel art website
                </a>
                <p>palette: https://lospec.com/palette-list/optimized-grayscale-4</p>
              </li>
              <li>Choose your desired conversion type: ASCII Art, Spreadsheet, or Assembly Code</li>
              <li>Adjust the width slider to control the size of the output</li>
              <li>
                For ASCII Art:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>Choose a character set that best fits your desired style</li>
                  <li>Toggle "Invert colors" - enabled by default for white backgrounds (like Notepad)</li>
                  <li>Disable "Invert colors" for dark backgrounds (like terminals)</li>
                </ul>
              </li>
              <li>
                For Spreadsheet:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>Choose your preferred format (ASCII Blocks, HEX Colors, or RGB Values)</li>
                  <li>For ASCII Blocks, adjust the detail level and invert option as needed</li>
                </ul>
              </li>
              <li>
                For Assembly Code:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>Upload a CSV file containing ASCII block characters</li>
                  <li>You can first convert an image to spreadsheet format, download the CSV, then upload it</li>
                  <li>Choose "Auto" display mode for best results in DOSBox (white text on black background)</li>
                  <li>The code will use INT 21h function 02h to display each character individually</li>
                  <li>Download the .asm file and assemble it with MASM or TASM</li>
                </ul>
              </li>
              <li>Click "Convert" to generate your chosen format</li>
              <li>Download or copy the result</li>
              <hr></hr>
              <a
               style={{ textDecoration: 'underline' }}
                  href="https://drive.google.com/drive/folders/1DxW4qQfn-_TV2VgXbUm5EfxhsiPB6XCt?usp=sharing"
                  target='_blank'
              >
                VIDEO TUTORIAL
              </a>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
