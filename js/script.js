// ============================================================
// 1. FIREBASE AYARLARI
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoUsSHjUL6n7hoja7jOXCSk51i4_Uvcq4",
  authDomain: "mobilya-firmasi.firebaseapp.com",
  projectId: "mobilya-firmasi",
  storageBucket: "mobilya-firmasi.firebasestorage.app",
  messagingSenderId: "1035596074234",
  appId: "1:1035596074234:web:529a04c9f520d64605cd43",
  measurementId: "G-8Z63M9SF0R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// 2. RESMİ METNE ÇEVİR (Base64)
// ============================================================
function compressAndConvertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleFactor = 800 / img.width;
                const newWidth = 800;
                const newHeight = img.height * scaleFactor;
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                const base64String = canvas.toDataURL('image/jpeg', 0.6);
                resolve(base64String);
            };
        };
        reader.onerror = (error) => reject(error);
    });
}

// ============================================================
// 3. ADMIN PANELİ İŞLEMLERİ
// ============================================================
if (window.location.pathname.includes("admin.html")) {

    // A) GİRİŞ İŞLEMİ
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e){
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const pass = document.getElementById('adminPassword').value;
            
            if(email === "admin@mobilya.com" && pass === "uu26478cT2YDsD") {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('dashboard-screen').style.display = 'block';
                loadAdminProducts();
            } else { 
                alert("Hatalı E-posta veya Şifre!"); 
            }
        });
    }

    // Çıkış Butonu
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(){ 
            location.reload(); 
        });
    }

    // B) Ürün Yükleme
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('productImage');
            const file = fileInput.files[0];
            const statusMsg = document.getElementById('uploadStatus');

            if (!file) return;
            statusMsg.textContent = "Yükleniyor... Lütfen bekleyin.";

            try {
                const base64Image = await compressAndConvertToBase64(file);
                await addDoc(collection(db, "products"), {
                    imageUrl: base64Image,
                    date: Date.now()
                });
                statusMsg.textContent = "✅ Fotoğraf Eklendi!";
                addForm.reset();
                loadAdminProducts(); 
            } catch (error) {
                console.error("Hata:", error);
                statusMsg.textContent = "❌ Hata: " + error.message;
            }
        });
    }

    // C) Admin Galeri Listeleme
    async function loadAdminProducts() {
        const grid = document.getElementById('adminProductGrid');
        if (!grid) return;

        grid.innerHTML = "<p style='width:100%; text-align:center;'>Yükleniyor...</p>"; 
        
        const q = query(collection(db, "products"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        grid.innerHTML = ""; 

        if (querySnapshot.empty) {
            grid.innerHTML = "<p style='width:100%; text-align:center;'>Henüz sisteme yüklenmiş fotoğraf yok.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const cardHTML = `
                <div class="admin-card" onclick="window.deleteProduct('${doc.id}')">
                    <img src="${data.imageUrl}" alt="Ürün">
                    <div class="delete-overlay">
                        <span class="delete-icon">🗑️</span>
                        <span class="delete-text">SİLMEK İÇİN TIKLA</span>
                    </div>
                </div>
            `;
            grid.innerHTML += cardHTML;
        });
    }

    // D) Ürün Silme
    window.deleteProduct = async function(docId) {
        if(!confirm("⚠️ BU FOTOĞRAFI SİLMEK İSTİYOR MUSUNUZ?\n\nBu işlem geri alınamaz.")) return;

        try {
            await deleteDoc(doc(db, "products", docId));
            loadAdminProducts(); 
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Silinirken hata oluştu.");
        }
    };
}

// ============================================================
// 4. MÜŞTERİ SAYFASI (urunler.html)
// ============================================================
if (window.location.pathname.includes("urunler.html")) {
    
    async function loadPublicProducts() {
        const grid = document.querySelector('.products-grid');
        
        const q = query(collection(db, "products"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        grid.innerHTML = "";

        if (querySnapshot.empty) {
            grid.innerHTML = "<p style='width:100%; text-align:center; grid-column:1/-1;'>Henüz ürün eklenmemiştir.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const html = `
                <div class="product-card">
                    <div class="product-img-wrapper">
                        <img src="${data.imageUrl}" loading="lazy">
                        <div class="overlay"><a href="iletisim.html" class="view-btn">Teklif Al</a></div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });
    }
    document.addEventListener('DOMContentLoaded', loadPublicProducts);
}

// ============================================================
// 5. LIGHTBOX (Büyüteç) - ARTIK HER SAYFADA ÇALIŞACAK
// ============================================================
function setupLightbox() {
    // Eğer modal zaten varsa tekrar ekleme
    if(!document.getElementById('imageModal')) {
        const modalHTML = `
            <div id="imageModal" class="modal">
                <span class="close">×</span>
                <img class="modal-content" id="img01">
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById("imageModal");
        const closeBtn = document.querySelector(".close");
        
        // Kapatma işlemleri
        closeBtn.onclick = function() { modal.style.display = "none"; }
        modal.onclick = function(e) { if (e.target === modal) modal.style.display = "none"; }
        document.addEventListener('keydown', function(event) {
            if (event.key === "Escape") modal.style.display = "none";
        });
    }
    
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("img01");
    
    // Sayfadaki HERHANGİ bir resim kapsayıcısına tıklanırsa çalışır
    document.body.addEventListener('click', function(e) {
        const wrapper = e.target.closest('.product-img-wrapper');
        if (wrapper) {
            if(e.target.classList.contains('view-btn')) return;
            e.preventDefault();
            const img = wrapper.querySelector('img');
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            modalImg.src = img.src;
        }
    });
}

// BU FONKSİYONU SAYFA YÜKLENİR YÜKLENMEZ ÇAĞIRIYORUZ (HER SAYFA İÇİN)
document.addEventListener('DOMContentLoaded', setupLightbox);