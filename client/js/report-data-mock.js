/**
 * Datos mock para el sistema de informes
 * 
 * Este archivo contiene datos de ejemplo que simulan la estructura
 * de una tasación completa. En el futuro, estos datos vendrán del
 * backend o del estado de la aplicación.
 */

const mockReportData = {
    // Información básica del informe
    reportInfo: {
        title: "Informe de Tasación",
        date: new Date().toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        reportNumber: "TAS-2024-001",
        tasador: "Ing. Juan Pérez",
        matricula: "MT-12345"
    },

    // Información de la propiedad tasada
    property: {
        type: "Departamento",
        address: "Av. Libertador 1234, Piso 5, Depto A",
        city: "Buenos Aires",
        province: "Capital Federal",
        country: "Argentina",
        surfaceTotal: 85,
        surfaceCovered: 75,
        rooms: 3,
        bedrooms: 2,
        bathrooms: 2,
        age: 15,
        floor: 5,
        totalFloors: 10,
        orientation: "Norte",
        parking: true,
        storage: true,
        balcony: true,
        terrace: false,
        pool: false,
        gym: true,
        security: true
    },

    // Características detalladas
    characteristics: {
        constructionQuality: "Muy buena",
        state: "Excelente",
        heating: "Central por losa",
        cooling: "Aire acondicionado split",
        flooring: "Porcelanato",
        kitchen: "Comedor diario integrado",
        windows: "Aluminio con DVH"
    },

    // Comparables utilizados
    comparables: [
        {
            address: "Av. Libertador 1400, Piso 4, Depto B",
            city: "Buenos Aires",
            surfaceTotal: 82,
            surfaceCovered: 72,
            rooms: 3,
            bedrooms: 2,
            bathrooms: 2,
            age: 12,
            price: 185000,
            pricePerM2: 2256,
            distance: 200,
            date: "2024-01-15"
        },
        {
            address: "Av. Libertador 1100, Piso 6, Depto C",
            city: "Buenos Aires",
            surfaceTotal: 88,
            surfaceCovered: 78,
            rooms: 3,
            bedrooms: 2,
            bathrooms: 2,
            age: 18,
            price: 195000,
            pricePerM2: 2216,
            distance: 350,
            date: "2024-01-10"
        },
        {
            address: "Av. Libertador 1300, Piso 3, Depto A",
            city: "Buenos Aires",
            surfaceTotal: 80,
            surfaceCovered: 70,
            rooms: 3,
            bedrooms: 2,
            bathrooms: 2,
            age: 20,
            price: 178000,
            pricePerM2: 2225,
            distance: 150,
            date: "2024-01-08"
        }
    ],

    // Resultado de la tasación
    valuation: {
        estimatedValue: 185000,
        valuePerM2: 2176,
        minValue: 175000,
        maxValue: 195000,
        currency: "USD",
        methodology: "Comparación de mercado con homogeneización"
    },

    // Fotografías (placeholder)
    photos: [
        {
            url: null,
            description: "Fachada del edificio"
        },
        {
            url: null,
            description: "Living comedor"
        },
        {
            url: null,
            description: "Cocina integrada"
        },
        {
            url: null,
            description: "Balcón"
        }
    ],

    // Metodología aplicada
    methodology: {
        description: "Se utilizó el método de comparación de mercado, seleccionando tres propiedades similares en la zona. Se aplicaron factores de homogeneización considerando superficie, antigüedad, estado de conservación y ubicación específica.",
        factors: [
            "Superficie total y cubierta",
            "Antigüedad de la construcción",
            "Estado de conservación",
            "Ubicación y acceso",
            "Servicios y amenities"
        ],
        adjustments: [
            "Ajuste por superficie: +2%",
            "Ajuste por antigüedad: -1%",
            "Ajuste por estado: +3%",
            "Ajuste por ubicación: 0%"
        ]
    },

    // Información del cliente
    client: {
        name: "García, María",
        purpose: "Compra-venta",
        contact: "maria.garcia@email.com"
    },

    // Observaciones y notas adicionales
    notes: [
        "La propiedad se encuentra en excelente estado de conservación.",
        "El edificio cuenta con servicios de seguridad 24hs.",
        "La ubicación es privilegiada, cercana a medios de transporte y comercios."
    ]
};

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = mockReportData;
}
