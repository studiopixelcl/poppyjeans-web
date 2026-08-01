PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);
INSERT INTO "Categories" VALUES(1,'Calza','calza');
INSERT INTO "Categories" VALUES(2,'Jeans','jeans');
INSERT INTO "Categories" VALUES(3,'Conjunto','conjunto');
INSERT INTO "Categories" VALUES(4,'Enterito','enterito');
INSERT INTO "Categories" VALUES(5,'Pantalones','pantalones');
INSERT INTO "Categories" VALUES(6,'Poleras','poleras');
INSERT INTO "Categories" VALUES(7,'Bodys','bodys');
CREATE TABLE Products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_normal REAL NOT NULL,
    precio_oferta REAL,
    en_oferta INTEGER DEFAULT 0, 
    oferta_limitada INTEGER DEFAULT 0,
    fecha_fin_oferta TEXT, 
    stock INTEGER DEFAULT 0,
    categoria_id INTEGER,
    categorias_ids TEXT, 
    etiquetas TEXT, 
    weight REAL DEFAULT 500, 
    is_pack INTEGER DEFAULT 0, 
    visible INTEGER DEFAULT 1,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
    
    imagen_url TEXT,
    tallas TEXT,
    colores TEXT,
    imagen_url_2 TEXT,
    imagen_url_3 TEXT, bestseller INTEGER DEFAULT 0, video_url TEXT, is_clearance INTEGER DEFAULT 0,
    FOREIGN KEY (categoria_id) REFERENCES Categories(id)
);
INSERT INTO "Products" VALUES(1,NULL,'Calza Faja Flare',replace('Lleva tu estilo y seguridad al siguiente nivel con una prenda diseñada para transformar tu silueta de forma inmediata. Esta calza, combina un diseño moderno y estético con una faja moldeadora integrada de alto rendimiento que destaca por su doble sistema de ajuste: un cierre plano que sube de forma totalmente invisible y, sobre este, tres niveles de broches regulables.\n\nEste diseño inteligente te permite personalizar la compresión de la zona abdominal según tus necesidades y comodidad. Lo mejor de todo es que el cierre queda completamente oculto y plano, garantizando un efecto de abdomen liso y estilizado que no se nota absolutamente nada bajo la ropa.','\n',char(10)),9500,NULL,0,0,NULL,23,1,'[1]',NULL,246,0,1,'2026-06-14 22:41:07',NULL,NULL,NULL,NULL,NULL,1,NULL,1);
INSERT INTO "Products" VALUES(2,NULL,'Conjunto Tres Piezas',replace('¿Buscas un outfit que te acompañe del entrenamiento a tus pendientes diarios sin perder el estilo? Este set de tres piezas está diseñado exactamente para eso. Olvídate de complicarte pensando qué ponerte; aquí tienes la combinación perfecta de comodidad, soporte y un diseño que favorece tu figura de forma natural.\n\nLa tela es ultra suave al tacto, se adapta a tu cuerpo como una segunda piel y, lo más importante: es 100% segura y libre de transparencias. Muévete, entrena y camina con total confianza.','\n',char(10)),29990,NULL,0,0,NULL,6,3,'[3]',NULL,500,0,1,'2026-06-14 22:45:04',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(3,NULL,'Calza Palazo',replace('La comodidad de una calza con la elegancia de un pantalón palazzo. ¡El calce perfecto que estabas buscando!\n\nOlvídate de elegir entre estar cómoda o verte arreglada. Este pantalón palazzo está diseñado para darte lo mejor de los dos mundos.pero con esa caída suelta, ancha y elegante que te hace lucir impecable en segundos. Es la prenda ideal para usar todo el día: desde tus pendientes diarios, hasta una salida a comer o una tarde de descanso en casa.','\n',char(10)),13500,NULL,0,0,NULL,20,1,'[1]',NULL,238,0,1,'2026-06-15 00:19:04',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(4,NULL,'Calza Fler Pretina Cruzada',replace('¿Buscas un outfit versátil que te haga sentir segura, cómoda y estilizada a cualquier hora del día? Este set de dos piezas es la respuesta. Diseñado con una textura premium de canales finos (microrib) que se adapta con suavidad a tu cuerpo, es perfecto tanto para tus entrenamientos como para tus actividades diarias.\n\nDisponible en una gama de colores pensados para combinar fácilmente con todo tu clóset, este conjunto se convertirá en tu opción favorita desde el primer momento en que te lo pruebes.','\n',char(10)),13500,NULL,0,0,NULL,16,1,'[1]',NULL,240,0,1,'2026-07-17 14:28:25',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(5,NULL,'Conjunto Brasileño Elegante','Hay días en los que necesitas un outfit que hable por ti. Este set sastrero es justo lo que tu clóset necesita para esos momentos en los que quieres lucir impecable, sofisticada y con un toque moderno sin tener que pasar horas pensando qué combinar. Con un calce espectacular que abraza tus curvas y una tela de caída ligera, es la combinación definitiva para tus reuniones, eventos especiales o para marcar pauta en tu día a día.',1,NULL,0,0,NULL,12,3,'[3]',NULL,414,0,1,'2026-07-17 14:32:17',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(6,NULL,'Conjunto Brasileño Elegante Short','Si estabas buscando ese conjunto que te haga sentir segura, cómoda y súper femenina, acabas de encontrarlo. Este set de corset strapless y short es la combinación definitiva para esos días en los que quieres lucir impecable sin complicarte la vida. Es perfecto para un almuerzo de fin de semana, una salida por la tarde con tus amigas o cualquier ocasión donde quieras destacar con un estilo fresco y sofisticado.',1,NULL,0,0,NULL,12,3,'[3]',NULL,220,0,1,'2026-07-17 14:35:40',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(7,NULL,'Conjunto Fler Dos Piezas',replace('Olvídate de la clásica ropa deportiva básica. Este Set de 2 Piezas redefine el concepto de comodidad y estilo urbano. Diseñado para adaptarse con precisión a tu cuerpo, este conjunto te entrega una silueta estilizada y moderna al instante, perfecta para enfrentar con total confianza tu operación diaria, tus viajes de negocios o tus entrenamientos favoritos.\n\nNo solo es vestuario, es una prenda que realza tu figura de forma natural y te da la libertad de moverte sin límites.','\n',char(10)),26000,NULL,0,0,NULL,6,3,'[3]',NULL,430,0,1,'2026-07-17 14:39:19',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(8,NULL,'Conjunto Fler Acinturado',replace('¿Buscas un outfit versátil que te haga sentir segura, cómoda y estilizada a cualquier hora del día? Este set de dos piezas es la respuesta. Diseñado con una textura premium de canales finos (microrib) que se adapta con suavidad a tu cuerpo, es perfecto tanto para tus entrenamientos como para tus actividades diarias.\n\nDisponible en una gama de colores pensados para combinar fácilmente con todo tu clóset, este conjunto se convertirá en tu opción favorita desde el primer momento en que te lo pruebes.','\n',char(10)),26000,NULL,0,0,NULL,10,3,'[3]',NULL,412,0,1,'2026-07-17 14:42:55',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(9,NULL,'Conjunto Yoga ',replace('Consigue un look impecable, moderno y listo en segundos con un conjunto diseñado para seguirte el ritmo todo el día. Este set de tres piezas combina a la perfección la comodidad que buscas con un estilo urbano increíble. Es el aliado ideal para tus entrenamientos, tus pendientes del día a día o simplemente para disfrutar de tus momentos de relajo con total libertad.\n\nSu gran fuerte es su tela premium ultra elasticada. Al ser una prenda con excelente elasticidad, se estira contigo en cada movimiento y vuelve a su forma original sin deformarse, adaptándose con total suavidad a tus curvas y haciéndote sentir cómoda desde el primer momento en que te lo pones.','\n',char(10)),29990,NULL,0,0,NULL,8,3,'[3]',NULL,480,0,1,'2026-07-17 14:49:06',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(10,NULL,'Enterito Brasileño Elegante ','Resuelve tu outfit completo con una prenda que derrocha elegancia, comodidad y actitud. Este enterito es la opción definitiva para lucir estilizada y sumamente cómoda en segundos, sin tener que pasar horas pensando en combinaciones. Con una caída fluida y un diseño impecable, se adapta de forma natural a tu silueta,asi que todo que ver para salidas, eventos o como a ti te acomo de ir un lugar comoda .',1,NULL,0,0,NULL,6,4,'[4]',NULL,360,0,1,'2026-07-17 14:57:59',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(11,NULL,'Enterito Moderno Brasileño ','Amiga, si buscas esa prenda que te resuelva el "qué me pongo" en un segundo y que además horme precioso, este enterito es tu nueva obsesión. Es el comodín perfecto que todas necesitamos en el clóset: elegante, ultra femenino y tan cómodo que vas a querer usarlo siempre. Es ideal para ir a trabajar sintiéndote empoderada, para un almuerzo con tus amigas o para una cita especial donde quieras robarte todas las miradas.',1,NULL,0,0,NULL,6,4,'[4]',NULL,330,0,1,'2026-07-17 15:03:55',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(12,NULL,'Jeans Cargo',replace('El Jean Cargo que lo tiene todo: Comodidad real y estilo urbano\n\nSi buscas un pantalón que te acompañe en tu rutina sin sacrificar estilo ni comodidad, este jean de silueta amplia y bolsillos cargo es tu opción ideal. Combina perfectamente la soltura de la pierna ancha con la practicidad de los detalles utilitarios, logrando un look moderno, relajado y muy favorecedor.','\n',char(10)),22990,18990,1,0,NULL,0,2,'[2]',NULL,739,0,1,'2026-07-17 15:08:14',NULL,NULL,NULL,NULL,NULL,1,NULL,0);
INSERT INTO "Products" VALUES(13,NULL,'Jeans Flare',replace('Un jean pensado para adaptarse a tu vida y a tu ritmo, no al revés. Creado para la mujer actual, este modelo combina una suavidad excepcional con un diseño que abraza y favorece tu figura de forma natural, dándote esa dosis extra de confianza que necesitas para tu día a día.\n\nSu tejido elástico de tacto suave se mueve contigo, eliminando cualquier sensación de rigidez para ofrecerte un confort total desde la mañana hasta la noche. Con su tiro alto de ajuste seguro y una elegante caída acampanada, es la prenda aliada que une la comodidad que amas con el estilo impecable que buscas en cada paso.','\n',char(10)),22990,18990,1,0,NULL,4,2,'[2]',NULL,473,0,1,'2026-07-17 15:13:11',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(14,NULL,'Jeans Mom','Amiga, sabemos perfectamente lo difícil que es encontrar ese jean que te quede pintado, que sea holgado y cómodo en las piernas pero que al mismo tiempo se ajuste bien a tu cintura sin dejar ese molesto espacio suelto atrás. ¡Tu búsqueda terminó! Este jean  que te va a hacer sentir hermosa, segura y súper cómoda durante todo el día.',1,NULL,0,0,NULL,0,2,'[2]',NULL,0,0,1,'2026-07-17 15:14:19',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(15,NULL,'Pantalon Fler con bolsillos',replace('¿Buscas un pantalón que combine la comodidad que amas con la elegancia que necesitas? Te presentamos el Fler con bolsillos \n\nEste pantalón no es solo ropa deportiva; es una prenda diseñada para acompañarte en cada momento de tu día. Desde una sesión de yoga hasta un café con amigas, o incluso un día de teletrabajo, te sentirás impecable y cómoda.\n\nLa tela es ultra suave al tacto y tiene la elasticidad perfecta para moverse contigo. ¿Lo mejor? Incorpora un bolsillos , ideal para llevar tu teléfono inteligente, llaves o tarjetas sin que se note y sin perder el estilo.','\n',char(10)),7000,NULL,0,0,NULL,16,5,'[5]',NULL,249,0,1,'2026-07-17 15:21:36',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(16,NULL,'Jeans Palazo','Este jean palazzo redefine el concepto de comodidad diaria sin perder un ápice de sofisticación. Diseñado con un tiro favorecedor que enmarca la cintura y unas sofisticadas costuras verticales en el frente, crea un efecto visual que alarga y estiliza la silueta de forma natural.',22900,18990,1,0,NULL,3,2,'[2]',NULL,664,0,1,'2026-07-19 00:27:55',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(17,NULL,'Polera de Perú Standar','',1,NULL,0,0,NULL,9,6,'[6]',NULL,0,0,1,'2026-07-21 02:35:02',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(18,NULL,'Bodys brasileños con Escote Atrás','',1,NULL,0,0,NULL,12,7,'[7]',NULL,0,0,1,'2026-07-21 03:16:39',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO "Products" VALUES(19,NULL,'Polera Sara Brasileña','Esta blusa corta de manga larga se distingue por su sofisticado y profundo escote cuadrado, que enmarca el cuello y los hombros con gracia y un toque contemporáneo. Su corte ajustado, con una banda inferior ancha y suave, define la silueta de manera favorecedora, ofreciendo un ajuste seguro y cómodo.',1,NULL,0,0,NULL,16,6,'[6]',NULL,0,0,1,'2026-07-21 04:17:35',NULL,NULL,NULL,NULL,NULL,0,NULL,0);
CREATE TABLE ProductVariants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    color_name TEXT,
    color_hex TEXT,
    tallas TEXT, 
    stock INTEGER DEFAULT 0,
    imagen_1 TEXT, 
    imagen_2 TEXT,
    imagen_3 TEXT,
    imagen_4 TEXT,
    imagen_5 TEXT, video_url TEXT,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);
INSERT INTO "ProductVariants" VALUES(79,15,'Único','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784301571819-0fc65104.jpg','http://localhost:8788/images/productos/p0/color-1784301578670-4d365604.jpg','http://localhost:8788/images/productos/p0/color-1784301581039-8c0ae98d.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(80,15,'Café','#5D372A','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784301608501-06f0e544.jpg','http://localhost:8788/images/productos/p0/color-1784301610771-729ece1e.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(81,15,'Plomo','#66676C','[]',0,'http://localhost:8788/images/productos/p0/color-1784301621167-06c65448.jpg','http://localhost:8788/images/productos/p0/color-1784301623592-0ddfddc7.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(82,15,'Azul','#3A455B','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784301648925-d529f7ba.jpg','http://localhost:8788/images/productos/p0/color-1784301650911-72df662c.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(83,15,'Plomo Oscuro','#40444D','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784301665111-3ea9e93e.jpg','http://localhost:8788/images/productos/p0/color-1784301666940-1e2effc5.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(89,4,'Azul','#3c4f76','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298159344-ebf44032.jpg','http://localhost:8788/images/productos/p0/color-1784298162551-2b328f21.jpg','http://localhost:8788/images/productos/p0/color-1784298166997-bf48c6cd.jpg','http://localhost:8788/images/productos/p0/color-1784298169988-9cf1c724.jpg',NULL,NULL);
INSERT INTO "ProductVariants" VALUES(90,4,'Café','#6B5750','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298177313-379b4a29.jpg','http://localhost:8788/images/productos/p0/color-1784298179138-dd23e8f1.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(91,4,'Plomo','#6E6566','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298185213-fd86644b.jpg','http://localhost:8788/images/productos/p0/color-1784298190129-86b92930.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(92,4,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298204229-46b3a878.jpg','http://localhost:8788/images/productos/p0/color-1784298207323-4402caa5.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(93,7,'Morado','#574A68','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784299027877-fc8ba910.jpg','http://localhost:8788/images/productos/p0/color-1784299030552-cb39f270.jpg','http://localhost:8788/images/productos/p0/color-1784299032755-497e7d6f.jpg','http://localhost:8788/images/productos/p0/color-1784299035030-1aa61919.jpg','http://localhost:8788/images/productos/p0/color-1784299037930-76a8a1a3.jpg',NULL);
INSERT INTO "ProductVariants" VALUES(94,7,'Negro','#1b1b1c','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784299047421-c25ee79e.jpg','http://localhost:8788/images/productos/p0/color-1784299045062-03ad8e5f.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(95,7,'Café','#4A3C3A','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784299060016-f4652e52.jpg','http://localhost:8788/images/productos/p0/color-1784299062241-925e6cff.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(115,11,'Café','#4D3227','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784300557350-68c23f33.jpg','http://localhost:8788/images/productos/p0/color-1784300559763-dad3d445.jpg','http://localhost:8788/images/productos/p0/color-1784300562362-9a73874b.jpg','http://localhost:8788/images/productos/p0/color-1784300564730-c47fe56d.jpg',NULL,NULL);
INSERT INTO "ProductVariants" VALUES(116,11,'Negro','#1b1b1c','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784300569645-025c3117.jpg','http://localhost:8788/images/productos/p0/color-1784300571795-ff4777fe.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(117,11,'Beige','#f3ece1','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784300576425-1d4b9bf7.jpg','http://localhost:8788/images/productos/p0/color-1784300578162-8865fd3c.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(118,6,'Beige','#DAC4AC','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298815643-4021c269.jpg','http://localhost:8788/images/productos/p0/color-1784298817941-e07e2330.jpg','http://localhost:8788/images/productos/p0/color-1784298820547-37bfa601.jpg','http://localhost:8788/images/productos/p0/color-1784298824212-8f39fcb6.jpg',NULL,NULL);
INSERT INTO "ProductVariants" VALUES(119,6,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298834888-ded087a0.jpg','http://localhost:8788/images/productos/p0/color-1784298836669-c35ef8e0.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(120,6,'Café','#7C4629','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298845896-2e7e4f34.jpg','http://localhost:8788/images/productos/p0/color-1784298849228-824a534e.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(121,14,'Negro','#313133','[{"size":"38","stock":0},{"size":"40","stock":0},{"size":"42","stock":0}]',0,'http://localhost:8788/images/productos/p0/color-1784301231024-04321984.jpg','http://localhost:8788/images/productos/p0/color-1784301232686-3eec5afe.jpg','http://localhost:8788/images/productos/p0/color-1784301234944-5ca64267.jpg','http://localhost:8788/images/productos/p0/color-1784301236828-75f9f11e.jpg','http://localhost:8788/images/productos/p0/color-1784301238816-32c235ef.jpg',NULL);
INSERT INTO "ProductVariants" VALUES(124,13,'Único','#1b1b1c','[{"size":"38","stock":1},{"size":"40","stock":1},{"size":"42","stock":1},{"size":"44","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784301092780-0e81ce6f.jpg','http://localhost:8788/images/productos/p0/color-1784301095530-9b0e8b71.jpg','http://localhost:8788/images/productos/p0/color-1784301098916-38f35fe6.jpg','http://localhost:8788/images/productos/p0/color-1784301102216-643c8c88.jpg','http://localhost:8788/images/productos/p0/color-1784301105574-0d587e1c.jpg',NULL);
INSERT INTO "ProductVariants" VALUES(149,16,'Blue Jeans','#3c4f76','[{"size":"40","stock":1},{"size":"42","stock":1},{"size":"44","stock":1}]',3,'http://localhost:8788/images/productos/p0/color-1784420820211-2580a730.jpg','http://localhost:8788/images/productos/p0/color-1784420822286-dd64c9d9.jpg','http://localhost:8788/images/productos/p0/color-1784420824403-86625f59.jpg','http://localhost:8788/images/productos/p0/color-1784420827126-aa85d7d3.jpg',NULL,NULL);
INSERT INTO "ProductVariants" VALUES(176,2,'Negro','#1b1b1c,#929396','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p2/negro-1784420699891-3cb820b1.jpg','http://localhost:8788/images/productos/p2/negro-1783475771711-f2a898b9.jpg','http://localhost:8788/images/productos/p2/negro-1784422555178-3c2d4834.jpg',NULL,NULL,'http://localhost:8788/images/videos/p2/negro-1784427101853-eb9f525d.mp4');
INSERT INTO "ProductVariants" VALUES(177,2,'Azul','#9DABB8,#36415C','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p2/azul-1784420667634-8e5182d2.jpg','http://localhost:8788/images/productos/p2/azul-1783475741387-05b0d363.jpg','http://localhost:8788/images/productos/p2/azul-1784420672425-953ea699.jpg','http://localhost:8788/images/productos/p2/azul-1784420677367-9d04ea7f.jpg','http://localhost:8788/images/productos/p2/azul-1783475748861-82e72cb5.jpg',NULL);
INSERT INTO "ProductVariants" VALUES(178,2,'Morado','#D2C9DA,#372A3B','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p2/morado-1784420686601-18cc956e.jpg','http://localhost:8788/images/productos/p2/morado-1783475758821-fffbc132.jpg','http://localhost:8788/images/productos/p2/morado-1784420692474-e6357a5f.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(179,3,'Azul','#5D5C88','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p3/azul-1783475640215-66c9b6a0.jpg','http://localhost:8788/images/productos/p3/azul-1783475642023-9c3c24a9.jpg','http://localhost:8788/images/productos/p3/azul-1783475643865-6cdc0b2a.jpg','http://localhost:8788/images/productos/p3/azul-1783475647140-de139884.jpg',NULL,'http://localhost:8788/images/videos/p3/azul-1784428074971-fe018396.mp4');
INSERT INTO "ProductVariants" VALUES(180,3,'Plomo Oscuro','#756B6C','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p3/plomo-oscuro-1783475662565-b9848a2d.jpg',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(181,3,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p3/negro-1783475667156-688c1d4a.jpg',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(182,3,'Café','#583A32','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p3/cafe-1783475671351-c434dc8b.jpg',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(183,3,'Burdeo','#713B4B','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p3/burdeo-1783475675131-b9fd009b.jpg',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(184,5,'Plomo','#58575E','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298626726-44ed6f4d.jpg','http://localhost:8788/images/productos/p0/color-1784298629482-0801393b.jpg','http://localhost:8788/images/productos/p0/color-1784298632038-f60e55bc.jpg','http://localhost:8788/images/productos/p0/color-1784298634833-8be15b35.jpg',NULL,'http://localhost:8788/images/videos/p5/plomo-1784409029297-4684889d.mp4');
INSERT INTO "ProductVariants" VALUES(185,5,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298641186-8967d719.jpg',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(186,5,'Terracota','#994933','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784298645553-d29bd7d1.jpg',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(187,9,'Negro','#1b1b1c','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p9/negro-1784428307051-107160ff.jpg','http://localhost:8788/images/productos/p0/color-1784299501345-6091dac1.jpg','http://localhost:8788/images/productos/p0/color-1784299504703-fee8758f.jpg','http://localhost:8788/images/productos/p0/color-1784299507511-d3802676.jpg','http://localhost:8788/images/productos/p0/color-1784299521802-7d3b8131.jpg','http://localhost:8788/images/videos/p9/negro-1784428436963-533f0995.mp4');
INSERT INTO "ProductVariants" VALUES(188,9,'Único','#706B4D','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p9/color-1784428532051-e0ea6f33.jpg','http://localhost:8788/images/productos/p9/color-1784428533901-39612889.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(189,9,'Plomo','#6D6C72','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784299583875-ea52febc.jpg','http://localhost:8788/images/productos/p0/color-1784299581755-238c49bc.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(190,9,'Azul','#3c4f76','[{"size":"S/M","stock":1},{"size":"M/L","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784299593675-b6fbe342.jpg','http://localhost:8788/images/productos/p0/color-1784299590550-98a96ec5.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(198,10,'Negro','#1b1b1c','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784300167874-cc2fff12.jpg','http://localhost:8788/images/productos/p0/color-1784300170786-bab3fdc9.jpg','http://localhost:8788/images/productos/p0/color-1784300173793-cf16f0fc.jpg','http://localhost:8788/images/productos/p0/color-1784300176260-4d20c135.jpg',NULL,'http://localhost:8788/images/videos/p10/negro-1784427824821-376dbb12.mp4');
INSERT INTO "ProductVariants" VALUES(199,10,'Beige','#DEC2AA','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784300185106-d25b9408.jpg','http://localhost:8788/images/productos/p0/color-1784300186913-0e734a09.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(200,10,'Café','#5D3734','[{"size":"S/M","stock":1},{"size":"L/XL","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784300191735-c275770a.jpg','http://localhost:8788/images/productos/p0/color-1784300194018-08ba8dc0.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(201,12,'Blue Jeans','#1A385A','[{"size":"36","stock":0},{"size":"38","stock":0},{"size":"40","stock":0},{"size":"42","stock":0},{"size":"44","stock":0}]',0,'http://localhost:8788/images/productos/p0/color-1784300746410-5423f49c.jpg','http://localhost:8788/images/productos/p0/color-1784300749256-e741f8df.jpg','http://localhost:8788/images/productos/p0/color-1784300751621-d3f6bb99.jpg','http://localhost:8788/images/productos/p0/color-1784300753896-df7b7b81.jpg',NULL,'http://localhost:8788/images/videos/p12/blue-jeans-1784409206791-35a8592a.mp4');
INSERT INTO "ProductVariants" VALUES(207,8,'Único','#627C7B','[{"size":"S","stock":1},{"size":"M","stock":1}]',2,'http://localhost:8788/images/productos/p8/color-1784416326375-18332243.jpg','http://localhost:8788/images/productos/p8/color-1784416329233-00ab9bcc.jpg','http://localhost:8788/images/productos/p8/color-1784416332316-758955df.jpg','http://localhost:8788/images/productos/p8/color-1784416343007-a70b8a5a.jpg',NULL,'http://localhost:8788/images/videos/p8/video-1784427644083-7a76e76f.mp4');
INSERT INTO "ProductVariants" VALUES(208,8,'Café','#5E463A','[{"size":"S","stock":1},{"size":"M","stock":1}]',2,'http://localhost:8788/images/productos/p8/cafe-1784416369975-0be2bcaa.jpg','http://localhost:8788/images/productos/p0/color-1784299260322-11001c2e.jpg','http://localhost:8788/images/productos/p8/cafe-1784416372167-8c4442bb.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(209,8,'Plomo','#878588','[{"size":"S","stock":1},{"size":"M","stock":1}]',2,'http://localhost:8788/images/productos/p8/plomo-1784416381430-d3c9b2bb.jpg','http://localhost:8788/images/productos/p0/color-1784299291853-5aaba063.jpg','http://localhost:8788/images/productos/p8/plomo-1784416384197-e15fc55c.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(210,8,'Verde','#8F9273','[{"size":"S","stock":1},{"size":"M","stock":1}]',2,'http://localhost:8788/images/productos/p0/color-1784299314424-02306e26.jpg','http://localhost:8788/images/productos/p0/color-1784299317158-1bcdd486.jpg','http://localhost:8788/images/productos/p0/color-1784299319902-a276eb1e.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(211,8,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1}]',2,'http://localhost:8788/images/productos/p8/negro-1784416454828-3878e773.jpg','http://localhost:8788/images/productos/p8/negro-1784416462752-767a1247.jpg','http://localhost:8788/images/productos/p8/negro-1784416460427-74121e95.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(212,17,'Único','#cccccc','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1}]',3,'http://localhost:8788/images/productos/p0/color-1784601252343-98aac417.jpg','http://localhost:8788/images/productos/p0/color-1784601253951-48e95858.jpg','http://localhost:8788/images/productos/p0/color-1784601256059-c7415090.jpg','http://localhost:8788/images/productos/p0/color-1784601259434-dc02bb7b.jpg',NULL,NULL);
INSERT INTO "ProductVariants" VALUES(213,17,'Único','#cccccc','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1}]',3,'http://localhost:8788/images/productos/p0/color-1784601276850-246d3222.jpg','http://localhost:8788/images/productos/p0/color-1784601280767-aa390dd7.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(214,17,'Único','#cccccc','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1}]',3,'http://localhost:8788/images/productos/p0/color-1784601292009-0bd24588.jpg','http://localhost:8788/images/productos/p0/color-1784601294064-8ce801dc.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(215,18,'Rojo','#e74c3c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784603692245-50ec1a43.jpg','http://localhost:8788/images/productos/p0/color-1784603688462-64fdaff4.jpg','http://localhost:8788/images/productos/p0/color-1784603686955-ee34829a.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(216,18,'Blanco','#ffffff','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784603750893-b86d2d81.jpg','http://localhost:8788/images/productos/p0/color-1784603752602-2a221b97.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(217,18,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784603758426-47beb313.jpg','http://localhost:8788/images/productos/p0/color-1784603760709-e8c7bd65.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(218,19,'Único','#692A3A','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784607291701-43cf533f.jpg','http://localhost:8788/images/productos/p0/color-1784607294026-a1117ff0.jpg','http://localhost:8788/images/productos/p0/color-1784607296767-73da9534.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(219,19,'Negro','#1b1b1c','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784607357166-7501d305.jpg','http://localhost:8788/images/productos/p0/color-1784607359416-d29892fd.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(220,19,'Blanco','#ffffff','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784607363899-ea77ec9f.jpg','http://localhost:8788/images/productos/p0/color-1784607367115-e68aa960.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(221,19,'Beige','#bfa3a1','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p0/color-1784607376298-15c40fec.jpg','http://localhost:8788/images/productos/p0/color-1784607374513-71b0ca06.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(222,1,'Burdeo','#5F2A3E','[]',0,'http://localhost:8788/images/productos/p1/color-1783459235301-5c64ceb1.jpg','http://localhost:8788/images/productos/p1/color-1783459237968-94ac5000.jpg',NULL,NULL,NULL,'http://localhost:8788/images/videos/p1/burdeo-1784427392480-7e3fa456.mp4');
INSERT INTO "ProductVariants" VALUES(223,1,'Plomo Oscuro','#454249','[{"size":"Única","stock":15}]',15,'http://localhost:8788/images/productos/p1/color-1783458848422-c7441383.jpg','http://localhost:8788/images/productos/p1/color-1783458850257-db64f8fb.jpg','http://localhost:8788/images/productos/p1/color-1783458852497-7b01d695.jpg',NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(224,1,'Café','#362720','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p1/color-1783459193278-b3c6b7dc.jpg','http://localhost:8788/images/productos/p1/color-1783459195203-401f62af.jpg',NULL,NULL,NULL,NULL);
INSERT INTO "ProductVariants" VALUES(225,1,'Negro','#171719','[{"size":"S","stock":1},{"size":"M","stock":1},{"size":"L","stock":1},{"size":"XL","stock":1}]',4,'http://localhost:8788/images/productos/p1/color-1783459266983-2876924a.jpg','http://localhost:8788/images/productos/p1/color-1783459269525-48ebe55b.jpg',NULL,NULL,NULL,NULL);
CREATE TABLE Customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    telefono TEXT,
    direccion TEXT,
    comuna TEXT,
    region TEXT,
    fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "Customers" VALUES(1,'107403432090662955629','Studio Pixel','studiopixelchile@gmail.com',NULL,'+56920650697','Santa Elena 31','Santiago','Los Ríos','2026-07-06 00:49:24');
INSERT INTO "Customers" VALUES(2,NULL,'Test Customer','testcustomer@example.com','89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8',NULL,NULL,NULL,NULL,'2026-07-15 15:52:49');
CREATE TABLE Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    total REAL NOT NULL,
    shipping_cost REAL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente', 
    tracking_code TEXT,
    courier TEXT,
    notas TEXT,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP, coupon_code TEXT, discount_amount REAL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES Customers(id)
);
INSERT INTO "Orders" VALUES(1,1,8734,7500,'Cancelado',NULL,NULL,NULL,'2026-07-06 00:49:24',NULL,0);
INSERT INTO "Orders" VALUES(2,1,987,0,'Cancelado',NULL,NULL,NULL,'2026-07-06 00:49:54','ENVIOFREE',247);
CREATE TABLE OrderItems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    variant_id INTEGER,
    product_name TEXT NOT NULL,
    variant_details TEXT, 
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    imagen_url TEXT,
    FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE SET NULL,
    FOREIGN KEY (variant_id) REFERENCES ProductVariants(id) ON DELETE SET NULL
);
INSERT INTO "OrderItems" VALUES(1,1,3,NULL,'Prueba (Talla 34)','Talla: 34',1,1234,'http://localhost:8788/images/productos/p3/color-1782924056333-315fd4d5.jpg');
INSERT INTO "OrderItems" VALUES(2,2,3,NULL,'Prueba (Talla 34)','Talla: 34',1,1234,'http://localhost:8788/images/productos/p3/color-1782924056333-315fd4d5.jpg');
CREATE TABLE Admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL, 
    password_hash TEXT NOT NULL,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "Admins" VALUES(1,'Administrador PoppyJeans','admin@poppyjeans.cl','superadmin','e8713adcd2a00ed14d92d14e9e47bd0171e04913cc1d62bdfd158d21c2a3c9e5','2026-06-14 22:40:40');
INSERT INTO "Admins" VALUES(2,'Studio Pixel','admin@studiopixel.cl','superadmin','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','2026-06-22 02:33:30');
CREATE TABLE AdminSessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    admin_id INTEGER NOT NULL,
    admin_name TEXT NOT NULL,
    admin_rol TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES Admins(id) ON DELETE CASCADE
);
INSERT INTO "AdminSessions" VALUES(3,'f0d976b8-7cfa-4b9e-ab2c-79365e334922-d3737c88-8723-4dc9-9794-aec7c2bd0510',1,'Administrador PoppyJeans','superadmin','2026-06-22 00:18:17','2026-06-15 00:18:17');
INSERT INTO "AdminSessions" VALUES(34,'78543c3c-df1f-4d5b-bd3e-3c67536f20b4-099725bd-39cc-4a13-a9b9-ceec497a4c91',2,'Studio Pixel','superadmin','2026-08-04 21:50:10','2026-07-28 21:50:10');
CREATE TABLE ActivityLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL, 
    entity_type TEXT NOT NULL, 
    entity_id TEXT,
    details TEXT,
    fecha TEXT NOT NULL
);
INSERT INTO "ActivityLogs" VALUES(1,'Administrador PoppyJeans','CREAR','Producto','2','Jeans de Prueba Premium','14-06-2026, 6:45:04 p. m.');
INSERT INTO "ActivityLogs" VALUES(2,'Administrador PoppyJeans','CREAR','Producto','3','Prueba','14-06-2026, 8:19:04 p. m.');
INSERT INTO "ActivityLogs" VALUES(3,'Studio Pixel','EDITAR','Producto','3','Prueba','01-07-2026, 12:41:30 p. m.');
INSERT INTO "ActivityLogs" VALUES(4,'Studio Pixel','CREAR','Cupon','1','ENVIOFREE','05-07-2026, 8:48:08 p. m.');
INSERT INTO "ActivityLogs" VALUES(5,'Studio Pixel','EDITAR','Cupon','1','Visibilidad en banner de cupón ID 1 cambiada a: oculto','05-07-2026, 8:50:17 p. m.');
INSERT INTO "ActivityLogs" VALUES(6,'Studio Pixel','EDITAR','Cupon','1','Visibilidad en banner de cupón ID 1 cambiada a: visible','05-07-2026, 8:50:18 p. m.');
INSERT INTO "ActivityLogs" VALUES(7,'Studio Pixel','EDITAR','Cupon','1','Estado de cupón ID 1 cambiado a: inactivo','05-07-2026, 8:50:18 p. m.');
INSERT INTO "ActivityLogs" VALUES(8,'Studio Pixel','EDITAR','Cupon','1','Estado de cupón ID 1 cambiado a: activo','05-07-2026, 8:50:19 p. m.');
INSERT INTO "ActivityLogs" VALUES(9,'Studio Pixel','EDITAR','Cupon','1','Cupón actualizado: ENVIOFREE','05-07-2026, 8:50:42 p. m.');
INSERT INTO "ActivityLogs" VALUES(10,'Studio Pixel','EDITAR','Producto','3','Prueba','05-07-2026, 9:05:13 p. m.');
INSERT INTO "ActivityLogs" VALUES(11,'Studio Pixel','EDITAR','Producto','3','Prueba','05-07-2026, 9:07:40 p. m.');
INSERT INTO "ActivityLogs" VALUES(12,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','07-07-2026, 5:21:44 p. m.');
INSERT INTO "ActivityLogs" VALUES(13,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','07-07-2026, 6:32:00 p. m.');
INSERT INTO "ActivityLogs" VALUES(14,'Studio Pixel','EDITAR','Producto','3','Calza Palazo','07-07-2026, 6:40:24 p. m.');
INSERT INTO "ActivityLogs" VALUES(15,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','07-07-2026, 6:40:45 p. m.');
INSERT INTO "ActivityLogs" VALUES(16,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','07-07-2026, 8:55:56 p. m.');
INSERT INTO "ActivityLogs" VALUES(17,'Studio Pixel','EDITAR','Producto','3','Calza Palazo','07-07-2026, 9:54:38 p. m.');
INSERT INTO "ActivityLogs" VALUES(18,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','07-07-2026, 9:56:23 p. m.');
INSERT INTO "ActivityLogs" VALUES(19,'Studio Pixel','CREAR','Producto','4','Calza Fler Pretina Cruzada','17-07-2026, 10:28:25 a. m.');
INSERT INTO "ActivityLogs" VALUES(20,'Studio Pixel','CREAR','Producto','5','Conjunto Brasileño Elegante','17-07-2026, 10:32:18 a. m.');
INSERT INTO "ActivityLogs" VALUES(21,'Studio Pixel','CREAR','Producto','6','Conjunto Brasileño Elegante Short','17-07-2026, 10:35:40 a. m.');
INSERT INTO "ActivityLogs" VALUES(22,'Studio Pixel','CREAR','Producto','7','Conjunto Fler Dos Piezas','17-07-2026, 10:39:19 a. m.');
INSERT INTO "ActivityLogs" VALUES(23,'Studio Pixel','CREAR','Producto','8','Conjunto Fler Acinturado','17-07-2026, 10:42:55 a. m.');
INSERT INTO "ActivityLogs" VALUES(24,'Studio Pixel','CREAR','Producto','9','Conjunto Yoga ','17-07-2026, 10:49:07 a. m.');
INSERT INTO "ActivityLogs" VALUES(25,'Studio Pixel','CREAR','Producto','10','Enterito Brasileño Elegante ','17-07-2026, 10:57:59 a. m.');
INSERT INTO "ActivityLogs" VALUES(26,'Studio Pixel','CREAR','Producto','11','Enterito Moderno Brasileño ','17-07-2026, 11:03:55 a. m.');
INSERT INTO "ActivityLogs" VALUES(27,'Studio Pixel','CREAR','Producto','12','Jeans Cargo','17-07-2026, 11:08:14 a. m.');
INSERT INTO "ActivityLogs" VALUES(28,'Studio Pixel','CREAR','Producto','13','Jeans Flare','17-07-2026, 11:13:11 a. m.');
INSERT INTO "ActivityLogs" VALUES(29,'Studio Pixel','CREAR','Producto','14','Jeans Mom','17-07-2026, 11:14:19 a. m.');
INSERT INTO "ActivityLogs" VALUES(30,'Studio Pixel','CREAR','Producto','15','Pantalon Fler con bolsillos','17-07-2026, 11:21:36 a. m.');
INSERT INTO "ActivityLogs" VALUES(31,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','18-07-2026, 11:58:59 a. m.');
INSERT INTO "ActivityLogs" VALUES(32,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','18-07-2026, 12:13:27 p. m.');
INSERT INTO "ActivityLogs" VALUES(33,'Studio Pixel','EDITAR','Producto','15','Pantalon Fler con bolsillos','18-07-2026, 12:13:54 p. m.');
INSERT INTO "ActivityLogs" VALUES(34,'Studio Pixel','EDITAR','Producto','8','Conjunto Fler Acinturado','18-07-2026, 12:14:43 p. m.');
INSERT INTO "ActivityLogs" VALUES(35,'Studio Pixel','EDITAR','Producto','4','Calza Fler Pretina Cruzada','18-07-2026, 12:15:03 p. m.');
INSERT INTO "ActivityLogs" VALUES(36,'Studio Pixel','EDITAR','Producto','7','Conjunto Fler Dos Piezas','18-07-2026, 12:15:29 p. m.');
INSERT INTO "ActivityLogs" VALUES(37,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 12:16:20 p. m.');
INSERT INTO "ActivityLogs" VALUES(38,'Studio Pixel','EDITAR','Producto','9','Conjunto Yoga ','18-07-2026, 12:16:46 p. m.');
INSERT INTO "ActivityLogs" VALUES(39,'Studio Pixel','EDITAR','Producto','3','Calza Palazo','18-07-2026, 12:17:07 p. m.');
INSERT INTO "ActivityLogs" VALUES(40,'Studio Pixel','EDITAR','Producto','5','Conjunto Brasileño Elegante','18-07-2026, 12:17:37 p. m.');
INSERT INTO "ActivityLogs" VALUES(41,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante ','18-07-2026, 12:18:02 p. m.');
INSERT INTO "ActivityLogs" VALUES(42,'Studio Pixel','EDITAR','Producto','11','Enterito Moderno Brasileño ','18-07-2026, 12:18:22 p. m.');
INSERT INTO "ActivityLogs" VALUES(43,'Studio Pixel','EDITAR','Producto','6','Conjunto Brasileño Elegante Short','18-07-2026, 12:19:08 p. m.');
INSERT INTO "ActivityLogs" VALUES(44,'Studio Pixel','EDITAR','Producto','14','Jeans Mom','18-07-2026, 12:19:20 p. m.');
INSERT INTO "ActivityLogs" VALUES(45,'Studio Pixel','EDITAR','Producto','13','Jeans Flare','18-07-2026, 12:19:34 p. m.');
INSERT INTO "ActivityLogs" VALUES(46,'Studio Pixel','EDITAR','Producto','12','Jeans Cargo','18-07-2026, 12:20:28 p. m.');
INSERT INTO "ActivityLogs" VALUES(47,'Studio Pixel','EDITAR','Producto','13','Jeans Flare','18-07-2026, 12:30:46 p. m.');
INSERT INTO "ActivityLogs" VALUES(48,'Studio Pixel','EDITAR','Producto','13','Jeans Flare (Cambio de estado)','18-07-2026, 12:32:33 p. m.');
INSERT INTO "ActivityLogs" VALUES(49,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 1:27:41 p. m.');
INSERT INTO "ActivityLogs" VALUES(50,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 1:27:57 p. m.');
INSERT INTO "ActivityLogs" VALUES(51,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare (Cambio de estado)','18-07-2026, 1:39:10 p. m.');
INSERT INTO "ActivityLogs" VALUES(52,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas (Cambio de estado)','18-07-2026, 1:39:27 p. m.');
INSERT INTO "ActivityLogs" VALUES(53,'Studio Pixel','EDITAR','Producto','3','Calza Palazo (Cambio de estado)','18-07-2026, 1:39:43 p. m.');
INSERT INTO "ActivityLogs" VALUES(54,'Studio Pixel','EDITAR','Producto','3','Calza Palazo (Cambio de estado)','18-07-2026, 1:42:14 p. m.');
INSERT INTO "ActivityLogs" VALUES(55,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas (Cambio de estado)','18-07-2026, 1:42:17 p. m.');
INSERT INTO "ActivityLogs" VALUES(56,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare (Cambio de estado)','18-07-2026, 1:42:19 p. m.');
INSERT INTO "ActivityLogs" VALUES(57,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante  (Cambio de estado)','18-07-2026, 1:42:22 p. m.');
INSERT INTO "ActivityLogs" VALUES(58,'Studio Pixel','EDITAR','Producto','11','Enterito Moderno Brasileño  (Cambio de estado)','18-07-2026, 1:42:25 p. m.');
INSERT INTO "ActivityLogs" VALUES(59,'Studio Pixel','EDITAR','Producto','11','Enterito Moderno Brasileño  (Cambio de estado)','18-07-2026, 1:42:31 p. m.');
INSERT INTO "ActivityLogs" VALUES(60,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante  (Cambio de estado)','18-07-2026, 1:42:34 p. m.');
INSERT INTO "ActivityLogs" VALUES(61,'Studio Pixel','EDITAR','Producto','11','Enterito Moderno Brasileño  (Cambio de estado)','18-07-2026, 1:45:30 p. m.');
INSERT INTO "ActivityLogs" VALUES(62,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante  (Cambio de estado)','18-07-2026, 1:45:36 p. m.');
INSERT INTO "ActivityLogs" VALUES(63,'Studio Pixel','EDITAR','Producto','5','Conjunto Brasileño Elegante','18-07-2026, 5:10:31 p. m.');
INSERT INTO "ActivityLogs" VALUES(64,'Studio Pixel','EDITAR','Producto','12','Jeans Cargo','18-07-2026, 5:13:28 p. m.');
INSERT INTO "ActivityLogs" VALUES(65,'Studio Pixel','EDITAR','Producto','8','Conjunto Fler Acinturado','18-07-2026, 7:14:39 p. m.');
INSERT INTO "ActivityLogs" VALUES(66,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 7:50:30 p. m.');
INSERT INTO "ActivityLogs" VALUES(67,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','18-07-2026, 8:25:06 p. m.');
INSERT INTO "ActivityLogs" VALUES(68,'Studio Pixel','CREAR','Producto','16','Jeans Palazo','18-07-2026, 8:27:55 p. m.');
INSERT INTO "ActivityLogs" VALUES(69,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','18-07-2026, 8:56:04 p. m.');
INSERT INTO "ActivityLogs" VALUES(70,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante  (Cambio de estado)','18-07-2026, 9:04:11 p. m.');
INSERT INTO "ActivityLogs" VALUES(71,'Studio Pixel','EDITAR','Producto','11','Enterito Moderno Brasileño  (Cambio de estado)','18-07-2026, 9:04:12 p. m.');
INSERT INTO "ActivityLogs" VALUES(72,'Studio Pixel','EDITAR','Producto','15','Pantalon Fler con bolsillos (Cambio de estado)','18-07-2026, 9:04:21 p. m.');
INSERT INTO "ActivityLogs" VALUES(73,'Studio Pixel','EDITAR','Producto','15','Pantalon Fler con bolsillos (Cambio de estado)','18-07-2026, 9:04:22 p. m.');
INSERT INTO "ActivityLogs" VALUES(74,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 9:41:10 p. m.');
INSERT INTO "ActivityLogs" VALUES(75,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','18-07-2026, 10:11:45 p. m.');
INSERT INTO "ActivityLogs" VALUES(76,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 10:16:34 p. m.');
INSERT INTO "ActivityLogs" VALUES(77,'Studio Pixel','EDITAR','Producto','8','Conjunto Fler Acinturado','18-07-2026, 10:20:46 p. m.');
INSERT INTO "ActivityLogs" VALUES(78,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante ','18-07-2026, 10:23:46 p. m.');
INSERT INTO "ActivityLogs" VALUES(79,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 10:24:15 p. m.');
INSERT INTO "ActivityLogs" VALUES(80,'Studio Pixel','EDITAR','Producto','2','Conjunto Tres Piezas','18-07-2026, 10:26:42 p. m.');
INSERT INTO "ActivityLogs" VALUES(81,'Studio Pixel','EDITAR','Producto','3','Calza Palazo','18-07-2026, 10:27:59 p. m.');
INSERT INTO "ActivityLogs" VALUES(82,'Studio Pixel','EDITAR','Producto','5','Conjunto Brasileño Elegante','18-07-2026, 10:28:24 p. m.');
INSERT INTO "ActivityLogs" VALUES(83,'Studio Pixel','EDITAR','Producto','9','Conjunto Yoga ','18-07-2026, 10:35:54 p. m.');
INSERT INTO "ActivityLogs" VALUES(84,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','18-07-2026, 10:37:04 p. m.');
INSERT INTO "ActivityLogs" VALUES(85,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante ','18-07-2026, 10:37:49 p. m.');
INSERT INTO "ActivityLogs" VALUES(86,'Studio Pixel','EDITAR','Producto','10','Enterito Brasileño Elegante ','18-07-2026, 10:38:11 p. m.');
INSERT INTO "ActivityLogs" VALUES(87,'Studio Pixel','EDITAR','Producto','12','Jeans Cargo','18-07-2026, 10:39:14 p. m.');
INSERT INTO "ActivityLogs" VALUES(88,'Studio Pixel','EDITAR','Producto','8','Conjunto Fler Acinturado','18-07-2026, 10:39:58 p. m.');
INSERT INTO "ActivityLogs" VALUES(89,'Studio Pixel','EDITAR','Producto','8','Conjunto Fler Acinturado','18-07-2026, 10:40:15 p. m.');
INSERT INTO "ActivityLogs" VALUES(90,'Studio Pixel','CREAR','Producto','17','Polera de Perú Standar','20-07-2026, 10:35:02 p. m.');
INSERT INTO "ActivityLogs" VALUES(91,'Studio Pixel','CREAR','Producto','18','Bodys brasileños con Escote Atrás','20-07-2026, 11:16:39 p. m.');
INSERT INTO "ActivityLogs" VALUES(92,'Studio Pixel','CREAR','Producto','19','Polera Sara Brasileña','21-07-2026, 12:17:35 a. m.');
INSERT INTO "ActivityLogs" VALUES(93,'Studio Pixel','EDITAR','Cupon','1','Visibilidad en banner de cupón ID 1 cambiada a: oculto','21-07-2026, 7:58:11 p. m.');
INSERT INTO "ActivityLogs" VALUES(94,'Studio Pixel','EDITAR','Cupon','1','Estado de cupón ID 1 cambiado a: inactivo','21-07-2026, 7:58:12 p. m.');
INSERT INTO "ActivityLogs" VALUES(95,'Studio Pixel','EDITAR','Cupon','1','Estado de cupón ID 1 cambiado a: activo','21-07-2026, 7:58:15 p. m.');
INSERT INTO "ActivityLogs" VALUES(96,'Studio Pixel','EDITAR','Cupon','1','Visibilidad en banner de cupón ID 1 cambiada a: visible','21-07-2026, 7:58:16 p. m.');
INSERT INTO "ActivityLogs" VALUES(97,'Studio Pixel','ELIMINAR','Cupon','1','Cupón eliminado: ENVIOFREE','21-07-2026, 7:58:26 p. m.');
INSERT INTO "ActivityLogs" VALUES(98,'Studio Pixel','CREAR','Cupon','2','CYBER','21-07-2026, 8:47:47 p. m.');
INSERT INTO "ActivityLogs" VALUES(99,'Studio Pixel','MIGRAR','Imagenes','0','Batch: 0 variantes migradas, faltan 0','24-07-2026, 6:32:09 p. m.');
INSERT INTO "ActivityLogs" VALUES(100,'Studio Pixel','EDITAR','Producto','1','Calza Faja Flare','24-07-2026, 6:50:11 p. m.');
CREATE TABLE Config (
    key TEXT PRIMARY KEY,
    value TEXT, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        descuento_porcentaje REAL NOT NULL,
        activo INTEGER DEFAULT 1,
        mostrar_en_banner INTEGER DEFAULT 0,
        fecha_inicio TEXT,
        fecha_fin TEXT,
        productos_ids TEXT,
        fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP
      );
INSERT INTO "Coupons" VALUES(2,'CYBER',20,1,1,'2026-07-22T00:46:00.000Z','2026-07-23T00:46:00.000Z','[16,13,12,19,18,17,15,14,11,10,9,8,7,6,5]','2026-07-22 00:47:47');
CREATE TABLE CustomerSessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE CASCADE
      );
INSERT INTO "CustomerSessions" VALUES(1,'72a5fb03-1345-49d3-af5a-57fcb8b9d0c1-932c8f3b-e54a-4c79-9d3d-af467727e55d',2,'2026-08-14 15:52:49','2026-07-15 15:52:49');
INSERT INTO "CustomerSessions" VALUES(2,'45b04e06-789f-4619-920a-8608fa389a35-8da83533-d277-440f-852b-25ea9d1ea91e',2,'2026-08-14 15:53:00','2026-07-15 15:53:00');
INSERT INTO "CustomerSessions" VALUES(3,'fce9b64b-5f61-41d4-a309-243683522d43-ecef1266-a3fa-4c65-892f-9429a5ab0821',1,'2026-08-25 01:42:46','2026-07-26 01:42:46');
INSERT INTO "CustomerSessions" VALUES(4,'919bc60b-a48e-4b0b-93d6-25072dc44e6e-2fed646d-d0ea-4a06-b0c2-87081b571261',1,'2026-08-27 21:48:19','2026-07-28 21:48:19');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('Categories',10);
INSERT INTO "sqlite_sequence" VALUES('Admins',2);
INSERT INTO "sqlite_sequence" VALUES('Products',19);
INSERT INTO "sqlite_sequence" VALUES('ProductVariants',225);
INSERT INTO "sqlite_sequence" VALUES('AdminSessions',34);
INSERT INTO "sqlite_sequence" VALUES('ActivityLogs',100);
INSERT INTO "sqlite_sequence" VALUES('Coupons',2);
INSERT INTO "sqlite_sequence" VALUES('Customers',2);
INSERT INTO "sqlite_sequence" VALUES('Orders',2);
INSERT INTO "sqlite_sequence" VALUES('OrderItems',2);
INSERT INTO "sqlite_sequence" VALUES('CustomerSessions',4);