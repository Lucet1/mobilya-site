// ============================================================
// 1. FIREBASE VE AUTH KÜTÜPHANELERİ
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// YENİ: Auth kütüphanesini ekledik
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app); // YENİ: Auth sistemini başlattık

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
// 3. ADMIN PANELİ İŞLEMLERİ (GÜVENLİ VERSİYON)
// ============================================================
if (window.location.pathname.includes("admin.html")) {

    // OTURUM DURUMUNU DİNLE (Sayfa yenilense bile hatırlar)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Kullanıcı giriş yapmışsa paneli göster
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            loadAdminProducts();
        } else {
            // Giriş yapmamışsa login ekranını göster
            document.getElementById('login-screen').style.display = 'block';
            document.getElementById('dashboard-screen').style.display = 'none';
        }
    });

    // A) GİRİŞ İŞLEMİ (ARTIK GOOGLE KONTROL EDİYOR)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e){
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const pass = document.getElementById('adminPassword').value;
            
            // Firebase'e soruyoruz: Bu bilgiler doğru mu?
            signInWithEmailAndPassword(auth, email, pass)
                .then((userCredential) => {
                    // Başarılı! onAuthStateChanged otomatik tetiklenir
                    console.log("Giriş Başarılı:", userCredential.user.email);
                })
                .catch((error) => {
                    console.error("Giriş Hatası:", error.code);
                    alert("Hatalı E-posta veya Şifre! (Hata: " + error.code + ")");
                });
        });
    }

    // Çıkış Butonu
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(){ 
            signOut(auth).then(() => {
                alert("Çıkış yapıldı.");
                location.reload();
            });
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
        
        try {
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
        } catch (error) {
            console.error("Yükleme hatası:", error);
        }
    }

    // D) Ürün Silme
    window.deleteProduct = async function(docId) {
        if(!confirm("⚠️ SİLMEK İSTİYOR MUSUNUZ?")) return;

        try {
            await deleteDoc(doc(db, "products", docId));
            loadAdminProducts(); 
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Yetkiniz yok veya bir hata oluştu.");
        }
    };
}

// ============================================================
// 4. MÜŞTERİ SAYFASI (SKELETON & LIGHTBOX DAHİL)
// ============================================================
if (window.location.pathname.includes("urunler.html")) {
    
    async function loadPublicProducts() {
        const grid = document.querySelector('.products-grid');
        
        // SKELETON LOADING
        let skeletonHTML = "";
        for(let i=0; i<8; i++) {
            skeletonHTML += `<div class="skeleton-card"><div class="skeleton-image"></div></div>`;
        }
        grid.innerHTML = skeletonHTML;

        try {
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

            setupLightbox();
            
        } catch (error) {
            console.error("Yükleme hatası:", error);
        }
    }
    document.addEventListener('DOMContentLoaded', loadPublicProducts);
}

// LIGHTBOX (Aynı Kalıyor)
function setupLightbox() {
    if(!document.getElementById('imageModal')) {
        const modalHTML = `
            <div id="imageModal" class="modal"><span class="close">×</span><img class="modal-content" id="img01"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById("imageModal");
        const closeBtn = document.querySelector(".close");
        closeBtn.onclick = function() { modal.style.display = "none"; }
        modal.onclick = function(e) { if (e.target === modal) modal.style.display = "none"; }
        document.addEventListener('keydown', function(event) { if (event.key === "Escape") modal.style.display = "none"; });
    }
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("img01");
    document.body.addEventListener('click', function(e) {
        const wrapper = e.target.closest('.product-img-wrapper');
        if (wrapper) {
            if(e.target.classList.contains('view-btn')) return;
            e.preventDefault();
            const img = wrapper.querySelector('img');
            if (!img || !img.src) return;
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            modalImg.src = img.src;
        }
    });
}
document.addEventListener('DOMContentLoaded', setupLightbox);

// ============================================================
// 6. SCROLL ANIMASYONLARI (ScrollReveal)
// ============================================================
// Sadece tarayıcıda ScrollReveal yüklendiyse çalışsın
if (typeof ScrollReveal !== 'undefined') {
    const sr = ScrollReveal({
        origin: 'bottom',   // Alttan gelsin
        distance: '60px',   // 60px mesafeden
        duration: 1000,     // 1 saniye sürsün
        delay: 200,         // Biraz beklesin
        reset: false        // Yukarı çıkıp inince tekrar etmesin (daha profesyonel)
    });

    // Hangi elemanlar nasıl gelsin?
    
    // 1. Üst Başlık ve Banner (Üstten insin)
    sr.reveal('.hero-content, .page-banner h2', { origin: 'top', distance: '80px' });

    // 2. Başlıklar (Soldan gelsin)
    sr.reveal('.section-title', { origin: 'left', interval: 200 });

    // 3. Ürün Kartları (Alttan sırayla gelsin)
    // interval: Kartlar tek tek pıt-pıt-pıt diye gelir
    sr.reveal('.product-card', { interval: 150 }); 

    // 4. Footer (Alttan gelsin)
    sr.reveal('footer', { distance: '20px', delay: 100 });
}

// ... diğer animasyon kodlarının altına ...

    // 5. CTA Bölümü (Zoom yaparak gelsin)
    sr.reveal('.cta-section', { scale: 0.85, duration: 1200 });

    // ============================================================
// 7. HAMBURGER MENÜ ÇALIŞTIRMA
// ============================================================
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-links");

if(hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active"); // Çizgiyi çarpı yap
        navMenu.classList.toggle("active");   // Menüyü aç/kapa
    });

    // Menüden bir linke tıklayınca menüyü otomatik kapat
    document.querySelectorAll(".nav-links li a").forEach(n => n.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
    }));
}