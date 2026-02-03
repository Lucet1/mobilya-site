// ============================================================
// 1. FIREBASE VE AUTH KÜTÜPHANELERİ
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
const auth = getAuth(app); 

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
// DÜZELTME: .html uzantısı olmasa da çalışsın diye "admin" olarak aratıyoruz
if (window.location.pathname.includes("admin")) {

    // OTURUM DURUMUNU DİNLE
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            loadAdminProducts();
        } else {
            document.getElementById('login-screen').style.display = 'block';
            document.getElementById('dashboard-screen').style.display = 'none';
        }
    });

    // GİRİŞ İŞLEMİ
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e){
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const pass = document.getElementById('adminPassword').value;
            
            signInWithEmailAndPassword(auth, email, pass)
                .then((userCredential) => {
                    console.log("Giriş Başarılı:", userCredential.user.email);
                })
                .catch((error) => {
                    console.error("Giriş Hatası:", error.code);
                    alert("Hatalı E-posta veya Şifre!");
                });
        });
    }

    // ÇIKIŞ BUTONU
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(){ 
            signOut(auth).then(() => {
                alert("Çıkış yapıldı.");
                location.reload();
            });
        });
    }

    // ÜRÜN YÜKLEME
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('productImage');
            const categoryInput = document.getElementById('productCategory'); 
            
            const file = fileInput.files[0];
            const category = categoryInput.value; 
            const statusMsg = document.getElementById('uploadStatus');

            if (!file) { alert("Lütfen bir resim seçin!"); return; }
            if (!category) { alert("Lütfen ürün durumu seçin!"); return; }

            statusMsg.textContent = "Yükleniyor... Lütfen bekleyin.";

            try {
                const base64Image = await compressAndConvertToBase64(file);
                
                await addDoc(collection(db, "products"), {
                    imageUrl: base64Image,
                    category: category, 
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

    // ADMIN GALERİ LİSTELEME
    async function loadAdminProducts() {
        const grid = document.getElementById('adminProductGrid');
        if (!grid) return;

        grid.innerHTML = "<p style='width:100%; text-align:center;'>Yükleniyor...</p>"; 
        
        try {
            const q = query(collection(db, "products"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);

            grid.innerHTML = ""; 

            if (querySnapshot.empty) {
                grid.innerHTML = "<p style='width:100%; text-align:center;'>Henüz ürün yok.</p>";
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const badgeIcon = data.category === 'refurbished' ? '♻️' : '✨';

                const cardHTML = `
                    <div class="admin-card" onclick="window.deleteProduct('${doc.id}')">
                        <div style="position:absolute; top:5px; left:5px; background:white; padding:2px 5px; border-radius:3px; font-size:12px; z-index:5;">${badgeIcon}</div>
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

    // ÜRÜN SİLME
    window.deleteProduct = async function(docId) {
        if(!confirm("⚠️ SİLMEK İSTİYOR MUSUNUZ?")) return;
        try {
            await deleteDoc(doc(db, "products", docId));
            loadAdminProducts(); 
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Hata oluştu.");
        }
    };
}

// ============================================================
// 4. MÜŞTERİ SAYFASI (AKILLI KATEGORİ SİSTEMİ)
// ============================================================
// DÜZELTME: .html uzantılarını kaldırıp genel arama yapıyoruz
if (
    window.location.pathname.includes("urunler") || 
    window.location.pathname.includes("sifir-urunler") || 
    window.location.pathname.includes("yenilenmis-urunler")
) {
    
    async function loadPublicProducts() {
        const grid = document.querySelector('.products-grid');
        
        // --- 1. Hangi Sayfadayız? ---
        const path = window.location.pathname;
        let targetCategory = 'all'; // Varsayılan: Hepsi (urunler.html için)

        if (path.includes("sifir-urunler")) {
            targetCategory = 'new';
        } else if (path.includes("yenilenmis-urunler")) {
            targetCategory = 'refurbished';
        }

        // --- 2. Skeleton Loading ---
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

            let productsFound = false;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const productCat = data.category || 'new'; // Eski veriler için varsayılan

                // --- 3. FİLTRELEME MANTIĞI ---
                if (targetCategory === 'new' && productCat !== 'new') return;
                if (targetCategory === 'refurbished' && productCat !== 'refurbished') return;

                productsFound = true;

                // --- 4. ROZET (BADGE) TASARIMI ---
                let badgeHTML = '';
                
                // SADECE ÖZEL SAYFALARDAYSAK ROZET GÖSTER (targetCategory 'all' DEĞİLSE)
                if (targetCategory !== 'all') {
                    if (productCat === 'refurbished') {
                        badgeHTML = `<span style="position:absolute; top:10px; left:10px; background:#27ae60; color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-weight:bold; z-index:10; box-shadow:0 2px 5px rgba(0,0,0,0.2);">♻️ Yenilenmiş</span>`;
                    } else {
                        badgeHTML = `<span style="position:absolute; top:10px; left:10px; background:#c9a24d; color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-weight:bold; z-index:10; box-shadow:0 2px 5px rgba(0,0,0,0.2);">✨ Sıfır</span>`;
                    }
                }
                // Eğer targetCategory 'all' ise (yani urunler.html) badgeHTML boş kalır.

                const whatsappLink = `https://wa.me/905427819966?text=Merhaba,%20web%20sitenizdeki%20bu%20ürün%20için%20fiyat%20bilgisi%20alabilir%20miyim?`;

                const html = `
                    <div class="product-card">
                        <div class="product-img-wrapper">
                            ${badgeHTML}
                            <img src="${data.imageUrl}" loading="lazy">
                            <div class="overlay">
                                <a href="${whatsappLink}" target="_blank" class="view-btn">
                                    <span style="font-size:18px; vertical-align:middle;">📞</span> Fiyat Sor
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', html);
            });

            if (!productsFound) {
                grid.innerHTML = "<p style='width:100%; text-align:center; grid-column:1/-1; padding:20px; color:#666;'>Bu kategoride henüz ürün bulunmamaktadır.</p>";
            }
            
            setupLightbox();
            
        } catch (error) {
            console.error("Yükleme hatası:", error);
        }
    }
    document.addEventListener('DOMContentLoaded', loadPublicProducts);
}

// ============================================================
// 5. LIGHTBOX (BÜYÜTEÇ)
// ============================================================
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
// 6. SCROLL ANIMASYONLARI
// ============================================================
if (typeof ScrollReveal !== 'undefined') {
    const sr = ScrollReveal({
        origin: 'bottom',
        distance: '60px',
        duration: 1000,
        delay: 200,
        reset: false
    });

    sr.reveal('.hero-content, .page-banner h2', { origin: 'top', distance: '80px' });
    sr.reveal('.section-title', { origin: 'left', interval: 200 });
    sr.reveal('.product-card', { interval: 150 }); 
    sr.reveal('footer', { distance: '20px', delay: 100 });
    sr.reveal('.cta-section', { scale: 0.85, duration: 1200 });
}

// ============================================================
// 7. HAMBURGER MENÜ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-links");

    if (hamburger) {
        console.log("✅ Hamburger menü hazır.");
        
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active"); 
            navMenu.classList.toggle("active");
        });

        document.querySelectorAll(".nav-links li a").forEach(link => {
            link.addEventListener("click", () => {
                hamburger.classList.remove("active");
                navMenu.classList.remove("active");
            });
        });
    }
});