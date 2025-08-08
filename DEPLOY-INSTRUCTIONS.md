# Deploy Instructions

Follow these steps to deploy your GHL Franchise Dashboard to Vercel:

## 🚀 Option 1: Direct Deploy from Local Files

### Prerequisites
- [Vercel CLI](https://vercel.com/cli) installed
- [Git](https://git-scm.com/) installed
- Vercel account (free at [vercel.com](https://vercel.com))

### Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to your project folder**:
   ```bash
   cd "c:\Users\Diss PC\My Standout GHL Developer Challenge Submission"
   ```

3. **Initialize and deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project? `N`
   - What's your project's name? `ghl-franchise-dashboard`
   - In which directory is your code located? `./` (current directory)
   - Want to override the settings? `N`

5. **Your site will be deployed** and you'll get a URL like:
   ```
   https://ghl-franchise-dashboard-xyz.vercel.app
   ```

## 🔗 Option 2: Deploy via GitHub (Recommended)

### Steps

1. **Create a new GitHub repository**:
   - Go to [github.com](https://github.com) and create a new repository
   - Name it `ghl-franchise-dashboard`

2. **Push your code to GitHub**:
   ```bash
   cd "c:\Users\Diss PC\My Standout GHL Developer Challenge Submission"
   git init
   git add .
   git commit -m "Initial commit: GHL Franchise Dashboard"
   git branch -M main
   git remote add origin https://github.com/yourusername/ghl-franchise-dashboard.git
   git push -u origin main
   ```

3. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it's a static site
   - Click "Deploy"

4. **Automatic deployments**:
   - Every time you push to the main branch, Vercel will automatically redeploy
   - You'll get a production URL like: `https://ghl-franchise-dashboard.vercel.app`

## ⚙️ Configuration

The following files are already configured for Vercel:

- ✅ `vercel.json` - Deployment configuration
- ✅ `package.json` - Project metadata
- ✅ `index.html` - Main entry point
- ✅ `js/dashboard.js` - Dashboard functionality

## 🌐 Custom Domain (Optional)

1. **In your Vercel dashboard**:
   - Go to your project settings
   - Click "Domains"
   - Add your custom domain

2. **Update DNS**:
   - Point your domain to Vercel's servers
   - Vercel will provide the DNS records

## 🔧 Environment Variables (Optional)

If you want to add API keys:

1. **In Vercel dashboard**:
   - Go to project settings
   - Click "Environment Variables"
   - Add your variables:
     - `JSONBIN_API_KEY`
     - `WEBHOOK_URL`

## 📱 Testing

After deployment, test your dashboard:

1. **Desktop**: Full functionality
2. **Mobile**: Responsive design
3. **Tablet**: Responsive layout
4. **Performance**: Should load in < 2 seconds

## 🎯 Expected Results

- ✅ Dashboard loads instantly
- ✅ Metrics update with simulated data
- ✅ Responsive on all devices
- ✅ Auto-refresh works
- ✅ Manual refresh button works
- ✅ Beautiful animations
- ✅ Professional look and feel

## 🆘 Troubleshooting

### Common Issues:

1. **Build fails**:
   - Ensure all files are in the correct locations
   - Check `vercel.json` syntax

2. **JavaScript errors**:
   - Check browser console for errors
   - Ensure `js/dashboard.js` is accessible

3. **Styling issues**:
   - CSS is embedded in `index.html`
   - Should work without external dependencies

### Support:
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Vercel Community: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

---

Your dashboard should now be live and accessible worldwide! 🎉
