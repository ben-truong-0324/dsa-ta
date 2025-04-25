@echo off
echo 🚀 Starting dsata Deployment with Local Docker Builds + Minikube Tunnel...

:: Step 0: Check Minikube and Docker
where minikube >nul 2>nul || (echo ❌ Minikube not found. Please install it first. & exit /b)
where docker >nul 2>nul || (echo ❌ Docker not found. Please install Docker CLI. & exit /b)

:: Step 1: Configure Minikube Docker daemon
echo 🔄 Setting Docker to use Minikube's internal Docker engine...
FOR /F "delims=" %%i IN ('minikube -p dsata docker-env --shell cmd') DO @%%i

:: Step 2: Rebuild Docker images locally inside Minikube
echo 🐳 Building local Docker images...
docker build -t dsata/frontend ./frontend
docker build -t dsata/backend ./backend
docker build -t dsata/ollama ./ollama
docker build -t dsata/db ./db
@REM docker build -t dsata/kafka ./kafka

:: Step 3: Start Minikube tunnel in a separate terminal
echo 🌐 Starting Minikube tunnel (required for LoadBalancer IPs)...
start "Minikube Tunnel" cmd /k "cd /d %CD% && minikube tunnel"

:: Step 4: Re-apply Kubernetes manifests
echo 📦 Redeploying Kubernetes components...

kubectl delete -f k8s/ --ignore-not-found
kubectl apply -f k8s/

:: Step 5: Wait for critical services to be ready
echo ⏳ Waiting for Deployments to become available...
kubectl wait --for=condition=available deployment/frontend --timeout=120s
kubectl wait --for=condition=available deployment/backend --timeout=120s
kubectl wait --for=condition=available deployment/ollama --timeout=120s
kubectl wait --for=condition=available deployment/jupyter --timeout=120s
kubectl wait --for=condition=available deployment/grafana --timeout=120s

:: Step 6: Output service endpoints
echo 🌍 Getting service IPs and Ingress rules...
kubectl get svc -o wide
kubectl get pods -o wide
kubectl get ingress

:: Step 7: Show live frontend logs (Flask)
echo ✅ dsata fully deployed using Minikube + local builds!
echo 🔗 Access via localhost:81 or EXTERNAL-IP from above
echo Flask Frontend Logs:

kubectl logs deployment/frontend -f