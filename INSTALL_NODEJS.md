# Installing Node.js on Windows

## Option 1: Download and Install Node.js (Recommended)

1. **Download Node.js:**
   - Go to: https://nodejs.org/
   - Download the **LTS version** (Long Term Support) - recommended for most users
   - Choose the Windows Installer (.msi) for your system (64-bit or 32-bit)

2. **Run the Installer:**
   - Double-click the downloaded `.msi` file
   - Follow the installation wizard
   - **Important:** Make sure to check "Add to PATH" during installation
   - Accept the default installation location
   - Complete the installation

3. **Verify Installation:**
   - Close and reopen your PowerShell/Command Prompt
   - Run these commands:
   ```powershell
   node --version
   npm --version
   ```
   - You should see version numbers (e.g., `v20.11.0` and `10.2.4`)

## Option 2: Install via Chocolatey (If you have Chocolatey)

If you have Chocolatey package manager installed:

```powershell
choco install nodejs-lts
```

## Option 3: Install via Winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS.LTS
```

## After Installation

1. **Restart PowerShell:**
   - Close your current PowerShell window
   - Open a new PowerShell window
   - Navigate back to your project:
   ```powershell
   cd D:\Repo\indegene_persona\indegenge_persona
   ```

2. **Verify Installation:**
   ```powershell
   node --version
   npm --version
   ```

3. **Install Frontend Dependencies:**
   ```powershell
   cd frontend
   npm install
   ```

## Troubleshooting

### If npm still not recognized after installation:

1. **Check PATH Environment Variable:**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "System variables", find "Path"
   - Make sure these are included:
     - `C:\Program Files\nodejs\`
     - `C:\Users\<YourUsername>\AppData\Roaming\npm`

2. **Restart Your Computer:**
   - Sometimes a full restart is needed for PATH changes to take effect

3. **Manual PATH Addition:**
   ```powershell
   # Add Node.js to PATH for current session
   $env:Path += ";C:\Program Files\nodejs"
   ```

### Alternative: Use nvm-windows (Node Version Manager)

If you want to manage multiple Node.js versions:

1. **Download nvm-windows:**
   - Go to: https://github.com/coreybutler/nvm-windows/releases
   - Download `nvm-setup.exe`

2. **Install nvm-windows:**
   - Run the installer
   - Follow the prompts

3. **Install Node.js via nvm:**
   ```powershell
   nvm install lts
   nvm use lts
   ```

## Quick Check Commands

After installation, verify everything works:

```powershell
# Check Node.js version
node --version

# Check npm version
npm --version

# Check npm configuration
npm config list
```

---

**Once Node.js is installed, continue with the Quick Start guide!**




