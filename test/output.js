var array = [];
var array2 = [
    1,
    2,
    3,
    '4',
    NaN,
    '5'
];
var array3 = [
    'stringEl',
    10000,
    false,
    null,
    undefined,
    NaN,
    {
        key: 'value1'
    },
    [
        1,
        2,
        3,
        4,
        '5'
    ],
    [
        'a',
        {
            b: 'c'
        }
    ],
    func2(),
    function () {
    },
    func(),
    [
        1,
        2,
        3,
        4,
        '5'
    ]
];
var obj = {
    IdeaName: {
        exMaxLength: langUnit.UNIT_NAME_MAX_LENTH,
        required: 1,
        requiredErrorMessage: '创意名称不能为空',
        exMaxLengthErrorMessage: '创意名称不能超过30个字符'
    },
    'key': {}
};

